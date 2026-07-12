import { Task } from '@/entities/task';
import { Workflow } from '@/entities/workflow';
import { WorkflowDeduplication } from '@/entities/workflow-deduplication';
import { config } from '@/config';
import { getQueueByName } from '@/lib/queue-factory';
import { logger } from '@/lib/logger';
import { QUEUE_NAMES } from '@/shared/constants';
import { TaskStatus } from '@/shared/task';
import { WorkflowHelper } from '@/services/helpers/workflow.helper';
import { WorkflowStatusStore } from '@/services/helpers/workflow-status-store.helper';
import { getServiceRepository } from '@/services/helpers/repository.helper';
import { TaskService } from '@/services/task.service';
import { WorkflowCleanupService } from '@/services/workflow-cleanup.service';
import { normalizeErrorReason } from '@/utils/error-reason';
import { Job } from 'bullmq';

const TERMINAL_WORKFLOW_STATUSES = ['completed', 'failed', 'expired'];
const TERMINAL_TASK_STATUSES = [TaskStatus.COMPLETED, TaskStatus.FAILED];

export class FlowManager {
    private static recoveryRunning = false;

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
        const normalizedReason = normalizeErrorReason(reason);

        logger.warn(
            {
                workflowId,
                taskId: job.id,
                taskName: job.data?.taskName,
                reason: normalizedReason
            },
            'Workflow task failure received'
        );

        const changed = await TaskService.failTask(job.id, normalizedReason);
        if (changed) {
            await this.updateWorkflowStatus(workflowId, 'failed', normalizedReason);
        }

        logger.warn(
            {
                workflowId,
                taskId: job.id,
                taskName: job.data?.taskName,
                changed,
                reason: normalizedReason
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
        const normalizedReason = reason === undefined ? undefined : normalizeErrorReason(reason);
        try {
            const storedStatus = await WorkflowStatusStore.updateById(workflowId, status);

            if (storedStatus === status) {
                logger.info(
                    { workflowId, status, reason: normalizedReason },
                    'Workflow status updated'
                );
                if (TERMINAL_WORKFLOW_STATUSES.includes(status)) {
                    try {
                        await getServiceRepository<WorkflowDeduplication>(
                            WorkflowDeduplication
                        ).delete({ workflowId });
                    } catch (error) {
                        logger.error(
                            { err: error, workflowId, status },
                            'Failed to release workflow deduplication key'
                        );
                    }
                    void WorkflowCleanupService.cleanupRuntimeForWorkflow(workflowId).catch(
                        error => {
                            logger.error(
                                { err: error, workflowId, status },
                                'Failed to clean workflow runtime keys after terminal status update'
                            );
                        }
                    );
                }
            } else {
                logger.debug(
                    {
                        workflowId,
                        requestedStatus: status,
                        storedStatus,
                        reason: normalizedReason
                    },
                    'Workflow status update skipped by terminal-state guard'
                );
            }
        } catch (err) {
            logger.error({ err, workflowId }, 'Failed to update workflow status');
        }
    }

    static async recoverActiveWorkflows() {
        const recoveryConfig = config.workflow.recovery;
        if (!recoveryConfig.enabled) {
            logger.info('Workflow recovery disabled.');
            return;
        }

        if (this.recoveryRunning) {
            logger.debug('Workflow recovery pass skipped because another pass is running');
            return;
        }

        this.recoveryRunning = true;
        let recoveredCount = 0;
        let selectedCount = 0;
        let lastCreatedAt: Date | null = null;
        let lastId: string | null = null;

        try {
            logger.info(
                {
                    batchSize: recoveryConfig.batchSize,
                    concurrency: recoveryConfig.concurrency,
                    yieldMs: recoveryConfig.yieldMs
                },
                'Workflow recovery pass started'
            );

            while (true) {
                const query = getServiceRepository<Workflow>(Workflow)
                    .createQueryBuilder('workflow')
                    .where('workflow.status IN (:...statuses)', {
                        statuses: ['pending', 'active']
                    })
                    .orderBy('workflow.createdAt', 'ASC')
                    .addOrderBy('workflow.id', 'ASC')
                    .take(recoveryConfig.batchSize);

                if (lastCreatedAt && lastId) {
                    query.andWhere(
                        '(workflow.createdAt > :lastCreatedAt OR (workflow.createdAt = :lastCreatedAt AND workflow.id > :lastId))',
                        { lastCreatedAt, lastId }
                    );
                }

                const batch = await query.getMany();

                if (batch.length === 0) break;

                selectedCount += batch.length;
                const lastWorkflow = batch[batch.length - 1];
                lastCreatedAt = lastWorkflow.createdAt;
                lastId = lastWorkflow.id;
                logger.info(
                    {
                        batchSize: batch.length,
                        lastWorkflowId: lastId,
                        concurrency: recoveryConfig.concurrency
                    },
                    'Workflow recovery batch started'
                );

                await this.runWithConcurrency(batch, recoveryConfig.concurrency, async workflow => {
                    try {
                        await this.recoverWorkflow(workflow);
                        recoveredCount += 1;
                    } catch (error) {
                        logger.error(
                            { err: error, workflowId: workflow.id },
                            'Workflow recovery failed'
                        );
                        await this.updateWorkflowStatus(
                            workflow.id,
                            'failed',
                            error instanceof Error ? error.message : String(error)
                        );
                    }
                });

                if (recoveryConfig.yieldMs > 0) {
                    await this.delay(recoveryConfig.yieldMs);
                }
            }

            logger.info({ selectedCount, recoveredCount }, 'Workflow recovery pass completed');
        } finally {
            this.recoveryRunning = false;
        }
    }

    static startRecoveryInBackground() {
        if (!config.workflow.recovery.enabled) {
            logger.info('Workflow startup recovery disabled.');
            return;
        }

        void this.recoverActiveWorkflows().catch(error => {
            logger.error({ err: error }, 'Workflow startup recovery failed');
        });
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

    private static async runWithConcurrency<T>(
        items: T[],
        concurrency: number,
        worker: (item: T) => Promise<void>
    ) {
        let index = 0;
        const workerCount = Math.min(concurrency, items.length);
        await Promise.all(
            Array.from({ length: workerCount }, async () => {
                while (index < items.length) {
                    const currentIndex = index;
                    index += 1;
                    await worker(items[currentIndex]);
                }
            })
        );
    }

    private static delay(ms: number) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}
