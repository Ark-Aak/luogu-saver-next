import { Workflow } from '@/entities/workflow';
import { logger } from '@/lib/logger';
import { QUEUE_NAMES } from '@/shared/constants';
import { Job, QueueEvents } from 'bullmq';
import { getQueueByName } from '@/lib/queue-factory';
import { config } from '@/config';

export class FlowManager {
    private static queueEvents: Map<string, QueueEvents> = new Map();

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
                    logger.debug({ workflowId, taskName, result }, 'Updating workflow result');
                    await transactionalEntityManager.save(workflow);
                }
            });
        } catch (err) {
            logger.error({ err, workflowId, taskName }, 'Failed to update workflow result');
            throw err;
        }
    }

    static async updateWorkflowStatus(jobId: string, status: string, reason?: string) {
        try {
            const updateResult = await Workflow.update({ rootJobId: jobId }, { status: status });

            if (updateResult.affected && updateResult.affected > 0) {
                logger.info({ jobId, status, reason }, 'Workflow status updated');
            }
        } catch (err) {
            logger.error({ err, jobId }, 'Failed to update workflow status');
        }
    }

    static setupQueueEvents() {
        if (this.queueEvents.size > 0) return;

        Object.values(QUEUE_NAMES).forEach(queueName => {
            const events = new QueueEvents(queueName, {
                connection: {
                    host: config.redis.host,
                    port: config.redis.port,
                    password: config.redis.password
                }
            });

            events.on('completed', async ({ jobId, returnvalue }) => {
                await this.updateWorkflowStatus(jobId, 'completed');

                const queueWrapper = getQueueByName(queueName);
                if (queueWrapper) {
                    const job = await Job.fromId(queueWrapper.queue, jobId);
                    if (job && job.data && job.data.workflowId && job.data.track) {
                        try {
                            await this.updateWorkflowResult(
                                job.data.workflowId,
                                job.data.taskName,
                                returnvalue
                            );
                        } catch (err) {
                            logger.error({ err, jobId }, 'Failed to update workflow result');
                        }
                    }
                }
            });

            events.on('failed', async ({ jobId, failedReason }) => {
                await this.updateWorkflowStatus(jobId, 'failed', failedReason);
            });

            this.queueEvents.set(queueName, events);
        });
    }
}
