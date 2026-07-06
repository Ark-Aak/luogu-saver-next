import { Task } from '@/entities/task';
import { Workflow } from '@/entities/workflow';
import { getQueueByName } from '@/lib/queue-factory';
import { WORKFLOW_TEMPLATES } from '@/lib/workflow-templates';
import { logger } from '@/lib/logger';
import { WorkflowHelper } from '@/services/helpers/workflow.helper';
import { findOneServiceEntity, getServiceRepository } from '@/services/helpers/repository.helper';
import { TaskStatus } from '@/shared/task';
import { validateFlowStructure, WorkflowDefinition } from '@/utils/flow-validator';
import { randomUUID } from 'node:crypto';

type WorkflowCreateOptions = {
    priority?: number;
};

const USER_WORKFLOW_PRIORITY = 1;

export class WorkflowService {
    static async createWorkflow(
        definition: WorkflowDefinition,
        options: WorkflowCreateOptions = {}
    ) {
        validateFlowStructure(definition);
        await this.ensureWorkflowQueueCapacity(definition);

        const priority = options.priority ?? USER_WORKFLOW_PRIORITY;
        const workflowId = randomUUID();
        const taskIds = WorkflowHelper.createTaskIds(definition);

        logger.info(
            {
                workflowId,
                priority,
                taskCount: definition.tasks.length,
                taskNames: definition.tasks.map(task => task.name)
            },
            'Creating workflow'
        );

        try {
            await Workflow.transaction(async manager => {
                const workflow = getServiceRepository<Workflow>(Workflow, manager).create({
                    id: workflowId,
                    rootJobId: null,
                    queueName: null,
                    definition,
                    status: 'active',
                    result: this.createInitialResult(definition)
                });
                await getServiceRepository<Workflow>(Workflow, manager).save(workflow);

                const tasks = definition.tasks.map(taskDef =>
                    getServiceRepository<Task>(Task, manager).create({
                        id: taskIds[taskDef.name],
                        type: taskDef.data.type,
                        payload: taskDef.data.payload,
                        status: TaskStatus.PENDING,
                        info: null,
                        workflowId,
                        taskName: taskDef.name,
                        priority,
                        result: null
                    })
                );
                await getServiceRepository<Task>(Task, manager).save(tasks);
            });

            logger.debug(
                {
                    workflowId,
                    taskIds,
                    priority,
                    taskCount: definition.tasks.length
                },
                'Workflow database rows created'
            );

            const runtimePlan = await WorkflowHelper.initializeRuntime(
                definition,
                workflowId,
                taskIds,
                priority
            );
            await WorkflowHelper.dispatchEntryPoints(runtimePlan.entryPointIds);

            logger.info(
                {
                    workflowId,
                    priority,
                    taskCount: definition.tasks.length,
                    entryPointIds: runtimePlan.entryPointIds,
                    reportTaskIds: runtimePlan.reportTaskIds,
                    trackTaskIds: runtimePlan.trackTaskIds
                },
                'Workflow created'
            );
            return {
                workflowId,
                taskIds: runtimePlan.taskIds,
                reportTaskIds: runtimePlan.reportTaskIds,
                trackTaskIds: runtimePlan.trackTaskIds
            };
        } catch (error) {
            logger.error({ error, workflowId }, 'Workflow creation failed');
            await this.cleanupFailedCreate(workflowId, Object.values(taskIds));
            throw error;
        }
    }

    static async createWorkflowFromTemplate(
        templateName: string,
        params: any,
        options: WorkflowCreateOptions = {}
    ) {
        logger.info(
            {
                templateName,
                priority: options.priority ?? USER_WORKFLOW_PRIORITY
            },
            'Creating workflow from template'
        );

        const templateBuilders = new Map<string, unknown>(Object.entries(WORKFLOW_TEMPLATES));
        const builder = templateBuilders.get(templateName);
        if (builder === undefined) throw new Error(`Template ${templateName} not found`);

        if (typeof builder !== 'function') {
            throw new Error(`Template ${templateName} is invalid`);
        }

        const definition = builder(params) as WorkflowDefinition;
        logger.debug(
            {
                templateName,
                taskCount: definition.tasks.length,
                taskNames: definition.tasks.map(task => task.name)
            },
            'Workflow template built definition'
        );

        return this.createWorkflow(definition, options);
    }

    static async getWorkflowById(id: string) {
        const workflow = await findOneServiceEntity<Workflow>(Workflow, { where: { id } });
        if (!workflow) return null;

        const taskRows = await getServiceRepository<Task>(Task).find({
            where: { workflowId: id }
        });
        const taskByName = new Map(taskRows.map(task => [task.taskName, task]));
        const tasks = (workflow.definition as WorkflowDefinition).tasks.map(taskDef => {
            const task = taskByName.get(taskDef.name);
            const fathers = taskDef.fathers || [];
            return {
                taskId: task?.id || null,
                taskName: taskDef.name,
                status: task ? this.formatTaskStatus(task.status) : 'missing',
                type: taskDef.data?.type || task?.type || null,
                target: taskDef.data?.payload?.target || task?.payload?.target || null,
                fathers,
                fatherIds: Object.fromEntries(
                    fathers
                        .map(fatherName => [fatherName, taskByName.get(fatherName)?.id])
                        .filter((entry): entry is [string, string] => typeof entry[1] === 'string')
                ),
                track: taskDef.track === true,
                report: taskDef.report === true,
                info: task?.info || null
            };
        });

        logger.debug(
            {
                workflowId: workflow.id,
                status: workflow.status,
                taskCount: taskRows.length,
                statusCounts: this.countTaskStatuses(taskRows)
            },
            'Workflow queried'
        );

        return {
            workflowId: workflow.id,
            status: workflow.status,
            createdAt: workflow.createdAt,
            updatedAt: workflow.updatedAt,
            tasks,
            result: workflow.result
        };
    }

    private static createInitialResult(definition: WorkflowDefinition) {
        const result: Record<string, any> = {};
        for (const task of definition.tasks) {
            if (task.track === true) result[task.name] = null;
        }
        return result;
    }

    private static async ensureWorkflowQueueCapacity(definition: WorkflowDefinition) {
        const jobsByQueue = new Map<string, number>();

        for (const task of definition.tasks) {
            const queueName = WorkflowHelper.resolveQueueName(task);
            jobsByQueue.set(queueName, (jobsByQueue.get(queueName) || 0) + 1);
        }

        for (const [queueName, jobsToAdd] of jobsByQueue) {
            logger.debug(
                {
                    queueName,
                    jobsToAdd
                },
                'Checking workflow queue capacity'
            );
            const queueWrapper = getQueueByName(queueName);
            if (await queueWrapper.wouldExceedMaxLength(jobsToAdd)) {
                logger.warn(
                    {
                        queueName,
                        jobsToAdd
                    },
                    'Workflow queue capacity check failed'
                );
                throw new Error('Queue is full. Please try again later.');
            }
            logger.debug(
                {
                    queueName,
                    jobsToAdd
                },
                'Workflow queue capacity check passed'
            );
        }
    }

    private static async cleanupFailedCreate(workflowId: string, taskIds: string[]) {
        try {
            await WorkflowHelper.cleanupRuntime(taskIds);
            await getServiceRepository<Task>(Task).delete(taskIds);
            await getServiceRepository<Workflow>(Workflow).delete({ id: workflowId });
            logger.info({ workflowId, taskIds }, 'Workflow creation cleanup completed');
        } catch (cleanupError) {
            logger.error({ cleanupError, workflowId }, 'Failed to clean up workflow creation');
        }
    }

    private static countTaskStatuses(taskRows: Task[]) {
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
}
