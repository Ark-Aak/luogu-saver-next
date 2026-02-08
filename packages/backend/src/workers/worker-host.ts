import {
    RateLimitError,
    Worker,
    Job,
    QueueEvents,
    type WorkerOptions,
    UnrecoverableError
} from 'bullmq';
import { type CommonTask, TaskStatus } from '@/shared/task';
import { TaskProcessor } from './task-processor';
import { PointGuard } from '@/lib/point-guard';
import { config } from '@/config';
import { logger } from '@/lib/logger';
import { TaskService } from '@/services/task.service';
import { emitToRoom } from '@/lib/socket';

export class WorkerHost<T extends CommonTask> {
    public worker: Worker<T>;

    constructor(
        queueName: string,
        private processor: TaskProcessor<T>,
        private pointGuard: PointGuard | null,
        options?: WorkerOptions
    ) {
        this.worker = new Worker<T>(queueName, this.handleJob, {
            connection: {
                host: config.redis.host,
                port: config.redis.port,
                password: config.redis.password,
                keyPrefix: config.redis.keyPrefix
            },
            concurrency: 5,
            limiter: {
                max: 100,
                duration: 1000
            },
            ...options
        });

        this.setupEvents();
    }

    private handleJob = async (job: Job<T>) => {
        if (this.pointGuard) {
            const hasPoints = await this.pointGuard.consume(1);
            if (!hasPoints) {
                logger.warn({ jobId: job.id }, 'Rate limited by PointGuard, delaying job...');
                throw new RateLimitError();
            }
        }
        return await this.processor.process(job);
    };

    private setupEvents() {
        const queueEvents = new QueueEvents(this.worker.name, {
            connection: {
                host: config.redis.host,
                port: config.redis.port,
                password: config.redis.password,
                keyPrefix: config.redis.keyPrefix
            }
        });

        this.worker.on('completed', async job => {
            logger.info({ jobId: job.id }, 'Job completed successfully.');
            emitToRoom(`task:${job.id}`, `task:${job.id}:completed`, { status: 'completed' });
            await TaskService.updateTask(
                job.id!,
                TaskStatus.COMPLETED,
                'Task completed successfully'
            );
        });

        this.worker.on('failed', async (job, err) => {
            const isFinalAttempt = job && job.attemptsMade >= (job.opts.attempts || 1);
            const isUnrecoverable = err instanceof UnrecoverableError;
            if (isFinalAttempt || isUnrecoverable) {
                emitToRoom(`task:${job?.id}`, `task:${job?.id}:failed`, {
                    status: 'failed',
                    error: err.message
                });
                logger.error({ jobId: job?.id, err }, 'Job failed PERMANENTLY.');
                if (job?.id) await TaskService.updateTask(job.id, TaskStatus.FAILED, err.message);
            } else {
                logger.warn(
                    { jobId: job?.id, attempt: job?.attemptsMade, err },
                    'Job failed, retrying...'
                );
            }
        });

        this.worker.on('active', async job => {
            logger.debug({ job: job?.data }, 'Job is now active.');
            if (job?.id)
                await TaskService.updateTask(job.id, TaskStatus.PROCESSING, 'Task is now active');
        });

        this.worker.on('error', err => {
            logger.error({ err }, 'Worker connection error');
        });

        this.worker.on('progress', async (job, progress) => {
            logger.debug({ jobId: job?.id, progress }, 'Job progress update.');
            if (job?.id)
                await TaskService.updateTask(job.id, TaskStatus.PROCESSING, progress as string);
        });

        queueEvents.on('delayed', (job: { jobId: string; delay: number }) => {
            logger.warn({ jobId: job.jobId, delay: job.delay }, 'Job has been delayed.');
        });

        queueEvents.on('waiting', (job: { jobId: string }) => {
            logger.debug({ jobId: job?.jobId }, 'Job queued.');
        });
    }

    public async close() {
        await this.worker.close();
    }
}
