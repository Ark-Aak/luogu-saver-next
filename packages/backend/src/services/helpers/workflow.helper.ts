import { Task as TaskEntity } from '@/entities/task';
import { Workflow } from '@/entities/workflow';
import { getQueueByName } from '@/lib/queue-factory';
import { logger } from '@/lib/logger';
import { redisClient } from '@/lib/redis';
import { QUEUE_NAMES } from '@/shared/constants';
import { CommonTask, TaskStatus, TaskType } from '@/shared/task';
import { getServiceRepository } from '@/services/helpers/repository.helper';
import { getRandomString } from '@/utils/string';
import { TaskDefinition, WorkflowDefinition } from '@/utils/flow-validator';

interface FlowTask extends TaskDefinition {
    track?: boolean;
    type?: string;
}

export type RuntimeWorkflowTask = CommonTask & {
    priority: number;
};

type RuntimeBuildOptions = {
    completedTaskNames?: Set<string>;
    taskResults?: Record<string, any>;
};

type RuntimePlan = {
    taskIds: Record<string, string>;
    reportTaskIds: Record<string, string>;
    trackTaskIds: Record<string, string>;
    entryPointIds: string[];
};

const TERMINAL_WORKFLOW_STATUSES = new Set(['completed', 'failed', 'expired']);
const TERMINAL_TASK_STATUSES = new Set([TaskStatus.COMPLETED, TaskStatus.FAILED]);

export class WorkflowHelper {
    static createTaskIds(definition: WorkflowDefinition): Record<string, string> {
        return Object.fromEntries(definition.tasks.map(task => [task.name, getRandomString(16)]));
    }

    static pickTaskIds(
        taskIds: Record<string, string>,
        taskNames: string[]
    ): Record<string, string> {
        return Object.fromEntries(taskNames.map(name => [name, taskIds[name]]));
    }

    static resolveQueueName(task: FlowTask): string {
        const queueName = task.queueName || QUEUE_NAMES[task.data?.type as TaskType];
        if (!queueName) {
            throw new Error(`No queue name defined for workflow task: ${task.name}`);
        }
        return queueName;
    }

    static async initializeRuntime(
        definition: WorkflowDefinition,
        workflowId: string,
        taskIds: Record<string, string>,
        priority: number,
        options: RuntimeBuildOptions = {}
    ): Promise<RuntimePlan> {
        const completedTaskNames = options.completedTaskNames || new Set<string>();
        const taskResults = options.taskResults || {};
        const descendants = this.buildDescendants(definition, taskIds);
        const runtimeTasks = definition.tasks.map(task =>
            this.toRuntimeTask(task, workflowId, taskIds, priority)
        );

        logger.info(
            {
                workflowId,
                taskCount: runtimeTasks.length,
                priority,
                completedTaskNames: [...completedTaskNames]
            },
            'Initializing workflow runtime state'
        );

        const multi = redisClient.multi();
        for (const task of runtimeTasks) {
            const fathers = task.fathers || [];
            const incompleteFatherCount = fathers.filter(
                name => !completedTaskNames.has(name)
            ).length;
            const descendantIds = descendants[task.id] || [];
            multi.set(this.taskDefKey(task.id), JSON.stringify(task));
            multi.set(this.taskCounterKey(task.id), String(incompleteFatherCount));
            multi.set(this.taskDescendantsKey(task.id), JSON.stringify(descendantIds));

            logger.debug(
                {
                    workflowId,
                    taskId: task.id,
                    taskName: task.taskName,
                    type: task.type,
                    queueName: QUEUE_NAMES[task.type],
                    fathers,
                    fatherIds: task.fatherIds || {},
                    descendantIds,
                    incompleteFatherCount,
                    track: task.track === true,
                    report: task.report === true,
                    priority
                },
                'Workflow runtime task initialized'
            );

            if (completedTaskNames.has(task.taskName || '')) {
                multi.set(this.taskReleasedKey(task.id), '1');
                if (taskResults[task.taskName || ''] !== undefined) {
                    multi.set(
                        this.taskResultKey(task.id),
                        JSON.stringify(this.unwrapStoredResult(taskResults[task.taskName || '']))
                    );
                }
            } else {
                multi.del(this.taskReleasedKey(task.id));
                multi.del(this.taskResultKey(task.id));
            }
        }
        await multi.exec();

        const reportTaskIds = this.pickTaskIds(
            taskIds,
            definition.tasks.filter(task => task.report === true).map(task => task.name)
        );
        const trackTaskIds = this.pickTaskIds(
            taskIds,
            definition.tasks.filter(task => task.track === true).map(task => task.name)
        );
        const entryPointIds = definition.tasks
            .filter(task => !task.fathers || task.fathers.length === 0)
            .map(task => taskIds[task.name]);

        logger.info(
            {
                workflowId,
                taskCount: runtimeTasks.length,
                entryPointIds,
                reportTaskIds,
                trackTaskIds
            },
            'Workflow runtime state initialized'
        );

        return {
            taskIds,
            reportTaskIds,
            trackTaskIds,
            entryPointIds
        };
    }

    static async dispatchEntryPoints(entrypointIds: string[]) {
        logger.info({ entrypointIds }, 'Dispatching workflow entrypoint tasks');
        await Promise.all(entrypointIds.map(id => this.dispatchTaskById(id, 'entrypoint')));
    }

    static async dispatchTaskById(taskId: string, reason = 'ready') {
        const runtimeTask = await this.getRuntimeTask(taskId);
        const taskRow = await getServiceRepository<TaskEntity>(TaskEntity).findOne({
            where: { id: taskId },
            select: ['id', 'status']
        });
        if (!taskRow) {
            logger.warn(
                {
                    workflowId: runtimeTask.workflowId,
                    taskId,
                    taskName: runtimeTask.taskName,
                    reason
                },
                'Workflow task dispatch skipped because task row is missing'
            );
            return;
        }
        if (TERMINAL_TASK_STATUSES.has(taskRow.status)) {
            logger.debug(
                {
                    workflowId: runtimeTask.workflowId,
                    taskId,
                    taskName: runtimeTask.taskName,
                    status: taskRow.status,
                    reason
                },
                'Workflow task dispatch skipped because task row is terminal'
            );
            return;
        }

        if (runtimeTask.workflowId) {
            const workflow = await getServiceRepository<Workflow>(Workflow).findOne({
                where: { id: runtimeTask.workflowId },
                select: ['id', 'status']
            });
            if (!workflow || TERMINAL_WORKFLOW_STATUSES.has(workflow.status)) {
                logger.debug(
                    {
                        workflowId: runtimeTask.workflowId,
                        taskId,
                        taskName: runtimeTask.taskName,
                        workflowStatus: workflow?.status || null,
                        reason
                    },
                    'Workflow task dispatch skipped because workflow is unavailable or terminal'
                );
                return;
            }
        }

        const queueName = QUEUE_NAMES[runtimeTask.type];
        if (!queueName) throw new Error(`No queue name defined for workflow task ID ${taskId}`);

        const queueWrapper = getQueueByName(queueName);
        const { priority, ...jobData } = runtimeTask;
        logger.info(
            {
                workflowId: runtimeTask.workflowId,
                taskId: runtimeTask.id,
                taskName: runtimeTask.taskName,
                type: runtimeTask.type,
                queueName,
                priority,
                reason
            },
            'Dispatching workflow task'
        );
        await queueWrapper.add(runtimeTask.taskName || runtimeTask.type, jobData, {
            jobId: runtimeTask.id,
            priority
        });
    }

    static async getFatherResults(task: CommonTask) {
        const fatherIds = task.fatherIds || {};
        const entries = Object.entries(fatherIds);
        if (entries.length === 0) {
            logger.debug(
                {
                    workflowId: task.workflowId,
                    taskId: task.id,
                    taskName: task.taskName,
                    fatherNames: []
                },
                'Workflow task has no upstream father results to load'
            );
            return {};
        }

        const resultKeys = entries.map(([, taskId]) => this.taskResultKey(taskId));
        const redisResults = await redisClient.mget(resultKeys);
        const result: Record<string, any> = {};
        let redisHitCount = 0;
        let dbHitCount = 0;
        const missingFatherNames: string[] = [];

        for (const [index, [fatherName, fatherId]] of entries.entries()) {
            const redisValue = redisResults[index];
            if (redisValue) {
                result[fatherName] = JSON.parse(redisValue);
                redisHitCount += 1;
                continue;
            }

            const fatherTask = await getServiceRepository<TaskEntity>(TaskEntity).findOne({
                where: { id: fatherId },
                select: ['id', 'result']
            });
            if (fatherTask?.result !== undefined && fatherTask.result !== null) {
                result[fatherName] = this.unwrapStoredResult(fatherTask.result);
                dbHitCount += 1;
            } else {
                missingFatherNames.push(fatherName);
            }
        }

        logger.debug(
            {
                workflowId: task.workflowId,
                taskId: task.id,
                taskName: task.taskName,
                fatherNames: entries.map(([fatherName]) => fatherName),
                redisHitCount,
                dbHitCount,
                missingFatherNames
            },
            'Loaded workflow upstream father results'
        );

        return result;
    }

    static async storeTaskResult(taskId: string, returnvalue: any) {
        await redisClient.set(
            this.taskResultKey(taskId),
            JSON.stringify(this.unwrapStoredResult(returnvalue))
        );
        logger.debug(
            {
                taskId,
                resultKeys: this.getResultKeys(this.unwrapStoredResult(returnvalue))
            },
            'Stored workflow task result in runtime cache'
        );
    }

    static async releaseDescendants(taskId: string) {
        const runtimeTask = await this.getRuntimeTask(taskId);
        const releaseResult = await redisClient.set(this.taskReleasedKey(taskId), '1', 'NX');
        if (releaseResult !== 'OK') {
            logger.debug(
                {
                    workflowId: runtimeTask.workflowId,
                    taskId,
                    taskName: runtimeTask.taskName
                },
                'Workflow task descendants already released'
            );
            return [];
        }

        const descendantIds = await this.getDescendantIds(taskId);
        const dispatchedTaskIds: string[] = [];
        const descendantCounters: Array<{ taskId: string; remaining: number }> = [];

        for (const descendantId of descendantIds) {
            const remaining = await redisClient.decr(this.taskCounterKey(descendantId));
            descendantCounters.push({ taskId: descendantId, remaining });
            if (remaining <= 0) {
                if (remaining < 0) await redisClient.set(this.taskCounterKey(descendantId), '0');
                if (await this.areFathersCompleted(descendantId)) {
                    await this.dispatchTaskById(descendantId, 'father-counter-zero');
                    dispatchedTaskIds.push(descendantId);
                } else {
                    logger.debug(
                        {
                            workflowId: runtimeTask.workflowId,
                            taskId,
                            taskName: runtimeTask.taskName,
                            descendantId
                        },
                        'Workflow descendant counter reached zero but fathers are not all completed'
                    );
                }
            }
        }

        logger.info(
            {
                workflowId: runtimeTask.workflowId,
                taskId,
                taskName: runtimeTask.taskName,
                descendantIds,
                descendantCounters,
                dispatchedTaskIds
            },
            'Released workflow task descendants'
        );

        return dispatchedTaskIds;
    }

    static async rebuildRuntimeFromRows(workflow: Workflow, taskRows: TaskEntity[]) {
        logger.info(
            {
                workflowId: workflow.id,
                taskCount: taskRows.length,
                statusCounts: this.countTaskStatuses(taskRows)
            },
            'Rebuilding workflow runtime state from database rows'
        );

        const taskIds = Object.fromEntries(
            taskRows.filter(task => task.taskName).map(task => [task.taskName as string, task.id])
        );
        const completedTaskNames = new Set(
            taskRows
                .filter(task => task.taskName && task.status === TaskStatus.COMPLETED)
                .map(task => task.taskName as string)
        );
        const taskResults = Object.fromEntries(
            taskRows
                .filter(task => task.taskName && task.result !== undefined && task.result !== null)
                .map(task => [task.taskName as string, task.result])
        );
        const priority =
            taskRows.find(task => task.priority !== null && task.priority !== undefined)
                ?.priority || 1;

        const plan = await this.initializeRuntime(
            workflow.definition,
            workflow.id,
            taskIds,
            priority,
            {
                completedTaskNames,
                taskResults
            }
        );

        logger.info(
            {
                workflowId: workflow.id,
                taskCount: taskRows.length,
                priority,
                entryPointIds: plan.entryPointIds
            },
            'Workflow runtime state rebuilt from database rows'
        );

        return plan;
    }

    static async dispatchReadyTasksForWorkflow(workflow: Workflow, taskRows: TaskEntity[]) {
        if (TERMINAL_WORKFLOW_STATUSES.has(workflow.status)) return [];

        logger.info(
            {
                workflowId: workflow.id,
                status: workflow.status,
                taskCount: taskRows.length,
                statusCounts: this.countTaskStatuses(taskRows)
            },
            'Scanning workflow for ready tasks'
        );

        const taskByName = new Map(taskRows.map(task => [task.taskName, task]));
        const dispatchedTaskIds: string[] = [];

        for (const taskDef of (workflow.definition as WorkflowDefinition).tasks) {
            const taskRow = taskByName.get(taskDef.name);
            if (!taskRow) {
                logger.warn(
                    {
                        workflowId: workflow.id,
                        taskName: taskDef.name
                    },
                    'Workflow ready-task scan skipped task because task row is missing'
                );
                continue;
            }
            if (TERMINAL_TASK_STATUSES.has(taskRow.status)) {
                logger.debug(
                    {
                        workflowId: workflow.id,
                        taskId: taskRow.id,
                        taskName: taskDef.name,
                        status: taskRow.status
                    },
                    'Workflow ready-task scan skipped terminal task'
                );
                continue;
            }
            if (!(await this.areTaskDefFathersCompleted(taskDef, taskByName))) {
                logger.debug(
                    {
                        workflowId: workflow.id,
                        taskId: taskRow.id,
                        taskName: taskDef.name,
                        fathers: taskDef.fathers || []
                    },
                    'Workflow ready-task scan skipped task with incomplete fathers'
                );
                continue;
            }

            const runtimeTask = await this.getRuntimeTask(taskRow.id);
            const queueName = QUEUE_NAMES[runtimeTask.type];
            const queueWrapper = getQueueByName(queueName);
            const existingJob = await queueWrapper.getJob(taskRow.id);
            const existingState = await existingJob?.getState();
            if (existingState && existingState !== 'completed' && existingState !== 'failed') {
                logger.debug(
                    {
                        workflowId: workflow.id,
                        taskId: taskRow.id,
                        taskName: taskDef.name,
                        queueName,
                        existingState
                    },
                    'Workflow ready-task scan skipped task with existing non-terminal job'
                );
                continue;
            }

            await this.dispatchTaskById(taskRow.id, 'recovery-ready');
            dispatchedTaskIds.push(taskRow.id);
        }

        logger.info(
            {
                workflowId: workflow.id,
                dispatchedTaskIds
            },
            'Workflow ready-task scan completed'
        );

        return dispatchedTaskIds;
    }

    static async cleanupRuntime(taskIds: string[]) {
        if (taskIds.length === 0) return;

        logger.info({ taskIds }, 'Cleaning up workflow runtime keys');

        const multi = redisClient.multi();
        for (const taskId of taskIds) {
            multi.del(this.taskDefKey(taskId));
            multi.del(this.taskCounterKey(taskId));
            multi.del(this.taskDescendantsKey(taskId));
            multi.del(this.taskResultKey(taskId));
            multi.del(this.taskReleasedKey(taskId));
        }
        await multi.exec();
    }

    static async getRuntimeTask(taskId: string): Promise<RuntimeWorkflowTask> {
        const taskDefStr = await redisClient.get(this.taskDefKey(taskId));
        if (!taskDefStr) {
            throw new Error(`Task definition not found for task ID ${taskId}`);
        }
        return JSON.parse(taskDefStr) as RuntimeWorkflowTask;
    }

    private static buildDescendants(
        definition: WorkflowDefinition,
        taskIds: Record<string, string>
    ): Record<string, string[]> {
        const descendants: Record<string, string[]> = {};
        for (const task of definition.tasks) {
            descendants[this.requireTaskId(taskIds, task.name)] = [];
        }
        for (const task of definition.tasks) {
            for (const fatherName of task.fathers || []) {
                descendants[this.requireTaskId(taskIds, fatherName)].push(
                    this.requireTaskId(taskIds, task.name)
                );
            }
        }
        return descendants;
    }

    private static toRuntimeTask(
        task: FlowTask,
        workflowId: string,
        taskIds: Record<string, string>,
        priority: number
    ): RuntimeWorkflowTask {
        const taskId = this.requireTaskId(taskIds, task.name);
        const fathers = task.fathers || [];
        const fatherIds = Object.fromEntries(
            fathers.map(fatherName => [fatherName, this.requireTaskId(taskIds, fatherName)])
        );

        return {
            ...task.data,
            id: taskId,
            type: task.data?.type as TaskType,
            payload: task.data?.payload,
            workflowId,
            taskName: task.name,
            track: task.track === true,
            report: task.report === true,
            fathers,
            fatherIds,
            priority
        };
    }

    private static async getDescendantIds(taskId: string): Promise<string[]> {
        const descendantIdsStr = await redisClient.get(this.taskDescendantsKey(taskId));
        if (!descendantIdsStr) return [];
        return JSON.parse(descendantIdsStr) as string[];
    }

    private static async areFathersCompleted(taskId: string) {
        const runtimeTask = await this.getRuntimeTask(taskId);
        const fatherIds = Object.values(runtimeTask.fatherIds || {});
        if (fatherIds.length === 0) return true;

        const fatherRows = await getServiceRepository<TaskEntity>(TaskEntity).findByIds(fatherIds);
        const statusById = new Map(fatherRows.map(task => [task.id, task.status]));
        return fatherIds.every(fatherId => statusById.get(fatherId) === TaskStatus.COMPLETED);
    }

    private static async areTaskDefFathersCompleted(
        taskDef: TaskDefinition,
        taskByName: Map<string | null, TaskEntity>
    ) {
        for (const fatherName of taskDef.fathers || []) {
            const fatherTask = taskByName.get(fatherName);
            if (!fatherTask || fatherTask.status !== TaskStatus.COMPLETED) return false;
        }
        return true;
    }

    private static getResultKeys(value: any) {
        if (!value || typeof value !== 'object') return [];
        return Object.keys(value);
    }

    private static countTaskStatuses(taskRows: Array<Pick<TaskEntity, 'status'>>) {
        const counts = {
            pending: 0,
            processing: 0,
            completed: 0,
            failed: 0
        };

        for (const task of taskRows) {
            counts[this.formatTaskStatus(task.status)] += 1;
        }

        return counts;
    }

    private static formatTaskStatus(status: TaskStatus) {
        switch (status) {
            case TaskStatus.PENDING:
                return 'pending' as const;
            case TaskStatus.PROCESSING:
                return 'processing' as const;
            case TaskStatus.COMPLETED:
                return 'completed' as const;
            case TaskStatus.FAILED:
                return 'failed' as const;
        }
    }

    private static unwrapStoredResult(value: any) {
        if (value && typeof value === 'object' && '__result' in value) return value.__result;
        if (value && typeof value === 'object' && 'result' in value && 'name' in value) {
            return value.result;
        }
        return value;
    }

    private static requireTaskId(taskIds: Record<string, string>, taskName: string) {
        const taskId = taskIds[taskName];
        if (!taskId) throw new Error(`Task ID missing for workflow task ${taskName}`);
        return taskId;
    }

    private static taskDefKey(taskId: string) {
        return `workflow:task:def:${taskId}`;
    }

    private static taskCounterKey(taskId: string) {
        return `workflow:task:counter:${taskId}`;
    }

    private static taskDescendantsKey(taskId: string) {
        return `workflow:task:descendants:${taskId}`;
    }

    private static taskResultKey(taskId: string) {
        return `workflow:task:result:${taskId}`;
    }

    private static taskReleasedKey(taskId: string) {
        return `workflow:task:released:${taskId}`;
    }
}
