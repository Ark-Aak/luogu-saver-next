import { Task } from '@/entities/task';
import { Workflow } from '@/entities/workflow';
import { getQueueByName } from '@/lib/queue-factory';
import { logger } from '@/lib/logger';
import { QUEUE_NAMES } from '@/shared/constants';
import { TaskStatus } from '@/shared/task';
import { WorkflowHelper } from '@/services/helpers/workflow.helper';
import { WorkflowStatusStore } from '@/services/helpers/workflow-status-store.helper';
import { getServiceRepository } from '@/services/helpers/repository.helper';
import { TaskService } from '@/services/task.service';
import { Job } from 'bullmq';
import { In, Not } from 'typeorm';

const TERMINAL_WORKFLOW_STATUSES = ['completed', 'failed', 'expired'];
const TERMINAL_TASK_STATUSES = [TaskStatus.COMPLETED, TaskStatus.FAILED];

export class FlowManager {
    static setupQueueEvents() {
        logger.info('Workflow DAG manager uses worker events for runtime scheduling.');
    }

    static async closeQueueEvents() {
        return;
    }

    static async handleWorkflowJobCompleted(job: Job, returnvalue: any) {
        const workflowId = job.data?.workflowId;
        const taskName = job.data?.taskName;
        if (!job.id || !workflowId || !taskName) return;

        try {
            logger.info(
                {
                    workflowId,
                    taskId: job.id,
                    taskName,
                    track: job.data.track === true,
                    report: job.data.report === true,
                    resultKeys: this.getResultKeys(returnvalue?.__result)
                },
                'Workflow task completion received'
            );

            await WorkflowHelper.storeTaskResult(job.id, returnvalue);
            const changed = await TaskService.completeTask(
                job.id,
                'Task completed successfully',
                returnvalue
            );

            if (job.data.track) {
                await this.updateWorkflowResult(workflowId, taskName, returnvalue);
            }

            let dispatchedTaskIds: string[] = [];
            if (changed) {
                dispatchedTaskIds = await WorkflowHelper.releaseDescendants(job.id);
            }

            logger.info(
                {
                    workflowId,
                    taskId: job.id,
                    taskName,
                    track: job.data.track === true,
                    report: job.data.report === true,
                    changed,
                    resultKeys: this.getResultKeys(returnvalue?.__result),
                    dispatchedTaskIds
                },
                'Workflow task completion processed'
            );

            await this.updateWorkflowCompletionIfFinished(workflowId);
        } catch (error) {
            logger.error(
                { err: error, jobId: job.id, workflowId },
                'Failed to complete workflow task'
            );
            await this.updateWorkflowStatus(
                workflowId,
                'failed',
                error instanceof Error ? error.message : String(error)
            );
        }
    }

    static async handleWorkflowJobFailed(job: Job<any>, reason: string) {
        const workflowId = job.data?.workflowId;
        if (!job.id || !workflowId) return;

        logger.warn(
            {
                workflowId,
                taskId: job.id,
                taskName: job.data?.taskName,
                reason
            },
            'Workflow task failure received'
        );

        const changed = await TaskService.failTask(job.id, reason);
        if (changed) {
            await this.updateWorkflowStatus(workflowId, 'failed', reason);
        }

        logger.warn(
            {
                workflowId,
                taskId: job.id,
                taskName: job.data?.taskName,
                changed,
                reason
            },
            'Workflow task failure processed'
        );
    }

    static async updateWorkflowResult(workflowId: string, taskName: string, result: any) {
        try {
            await Workflow.transaction(async transactionalEntityManager => {
                const workflow = await transactionalEntityManager.findOne(Workflow, {
                    where: { id: workflowId },
                    lock: { mode: 'pessimistic_write' }
                });
                if (workflow) {
                    const currentResult = workflow.result
                        ? JSON.parse(JSON.stringify(workflow.result))
                        : {};
                    currentResult[taskName] = {
                        result: result.__result,
                        name: result.__name
                    };
                    workflow.result = currentResult;
                    logger.debug(
                        {
                            workflowId,
                            taskName,
                            resultKeys: this.getResultKeys(result.__result)
                        },
                        'Updating workflow result'
                    );
                    await transactionalEntityManager.save(workflow);
                }
            });
        } catch (err) {
            logger.error({ err, workflowId, taskName }, 'Failed to update workflow result');
            throw err;
        }
    }

    static async updateWorkflowStatus(workflowId: string, status: string, reason?: string) {
        try {
            const storedStatus = await WorkflowStatusStore.updateById(workflowId, status);

            if (storedStatus === status) {
                logger.info({ workflowId, status, reason }, 'Workflow status updated');
            } else {
                logger.debug(
                    {
                        workflowId,
                        requestedStatus: status,
                        storedStatus,
                        reason
                    },
                    'Workflow status update skipped by terminal-state guard'
                );
            }
        } catch (err) {
            logger.error({ err, workflowId }, 'Failed to update workflow status');
        }
    }

    static async recoverActiveWorkflows() {
        const workflows = await getServiceRepository<Workflow>(Workflow).find({
            where: { status: Not(In(TERMINAL_WORKFLOW_STATUSES)) }
        });

        logger.info({ count: workflows.length }, 'Workflow recovery pass started');

        for (const workflow of workflows) {
            try {
                await this.recoverWorkflow(workflow);
            } catch (error) {
                logger.error({ err: error, workflowId: workflow.id }, 'Workflow recovery failed');
                await this.updateWorkflowStatus(
                    workflow.id,
                    'failed',
                    error instanceof Error ? error.message : String(error)
                );
            }
        }

        logger.info({ count: workflows.length }, 'Workflow recovery pass completed');
    }

    private static async recoverWorkflow(workflow: Workflow) {
        const taskRows = await getServiceRepository<Task>(Task).find({
            where: { workflowId: workflow.id }
        });
        if (taskRows.length === 0) {
            logger.warn({ workflowId: workflow.id }, 'Workflow recovery skipped empty workflow');
            return;
        }

        logger.info(
            {
                workflowId: workflow.id,
                taskCount: taskRows.length,
                ...this.getTaskStatusCounts(taskRows)
            },
            'Recovering workflow'
        );

        await WorkflowHelper.rebuildRuntimeFromRows(workflow, taskRows);

        for (const task of taskRows) {
            if (TERMINAL_TASK_STATUSES.includes(task.status)) continue;

            const queueName = QUEUE_NAMES[task.type];
            if (!queueName) continue;

            const queueWrapper = getQueueByName(queueName);
            const job = await queueWrapper.getJob(task.id);
            if (!job) {
                logger.debug(
                    {
                        workflowId: workflow.id,
                        taskId: task.id,
                        taskName: task.taskName,
                        queueName
                    },
                    'Workflow recovery found no BullMQ job for non-terminal task'
                );
                continue;
            }

            const state = await job.getState();
            logger.debug(
                {
                    workflowId: workflow.id,
                    taskId: task.id,
                    taskName: task.taskName,
                    queueName,
                    jobState: state
                },
                'Workflow recovery inspected BullMQ job state'
            );
            if (state === 'completed') {
                logger.info(
                    {
                        workflowId: workflow.id,
                        taskId: task.id,
                        taskName: task.taskName,
                        queueName,
                        jobState: state
                    },
                    'Workflow recovery replaying completed job'
                );
                await this.handleWorkflowJobCompleted(job, job.returnvalue);
            } else if (state === 'failed') {
                logger.info(
                    {
                        workflowId: workflow.id,
                        taskId: task.id,
                        taskName: task.taskName,
                        queueName,
                        jobState: state
                    },
                    'Workflow recovery replaying failed job'
                );
                await this.handleWorkflowJobFailed(job, job.failedReason || 'Task failed');
            }
        }

        const latestTaskRows = await getServiceRepository<Task>(Task).find({
            where: { workflowId: workflow.id }
        });
        if (latestTaskRows.some(task => task.status === TaskStatus.FAILED)) {
            logger.info(
                {
                    workflowId: workflow.id,
                    ...this.getTaskStatusCounts(latestTaskRows)
                },
                'Workflow recovery detected failed workflow'
            );
            await this.updateWorkflowStatus(workflow.id, 'failed');
            return;
        }

        if (latestTaskRows.every(task => task.status === TaskStatus.COMPLETED)) {
            logger.info(
                {
                    workflowId: workflow.id,
                    ...this.getTaskStatusCounts(latestTaskRows)
                },
                'Workflow recovery detected completed workflow'
            );
            await this.updateWorkflowStatus(workflow.id, 'completed');
            return;
        }

        const dispatchedTaskIds = await WorkflowHelper.dispatchReadyTasksForWorkflow(
            workflow,
            latestTaskRows
        );
        logger.info(
            {
                workflowId: workflow.id,
                dispatchedTaskIds,
                ...this.getTaskStatusCounts(latestTaskRows)
            },
            'Workflow recovery completed for active workflow'
        );
        await this.updateWorkflowStatus(workflow.id, 'active');
    }

    private static async updateWorkflowCompletionIfFinished(workflowId: string) {
        const taskRows = await getServiceRepository<Task>(Task).find({
            where: { workflowId },
            select: ['id', 'status']
        });

        if (taskRows.length === 0) return;
        if (taskRows.some(task => task.status === TaskStatus.FAILED)) {
            logger.info(
                {
                    workflowId,
                    taskCount: taskRows.length,
                    ...this.getTaskStatusCounts(taskRows)
                },
                'Workflow completion check detected failed task'
            );
            await this.updateWorkflowStatus(workflowId, 'failed');
            return;
        }
        if (taskRows.every(task => task.status === TaskStatus.COMPLETED)) {
            logger.info(
                {
                    workflowId,
                    taskCount: taskRows.length,
                    ...this.getTaskStatusCounts(taskRows)
                },
                'Workflow completion check detected completed workflow'
            );
            await this.updateWorkflowStatus(workflowId, 'completed');
            return;
        }

        logger.debug(
            {
                workflowId,
                taskCount: taskRows.length,
                ...this.getTaskStatusCounts(taskRows)
            },
            'Workflow completion check remains active'
        );
    }

    private static getResultKeys(result: any) {
        if (!result || typeof result !== 'object') return [];
        return Object.keys(result);
    }

    private static getTaskStatusCounts(taskRows: Array<Pick<Task, 'status'>>) {
        const counts = {
            pendingCount: 0,
            processingCount: 0,
            completedCount: 0,
            failedCount: 0
        };

        for (const task of taskRows) {
            switch (task.status) {
                case TaskStatus.PENDING:
                    counts.pendingCount += 1;
                    break;
                case TaskStatus.PROCESSING:
                    counts.processingCount += 1;
                    break;
                case TaskStatus.COMPLETED:
                    counts.completedCount += 1;
                    break;
                case TaskStatus.FAILED:
                    counts.failedCount += 1;
                    break;
            }
        }

        return counts;
    }
}
