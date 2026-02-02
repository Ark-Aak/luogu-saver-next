import { Queue, JobsOptions, Job } from 'bullmq';
import { config } from '@/config';
import { logger } from '@/lib/logger';

export class TypedQueue<T> {
    public queue: Queue;

    constructor(queueName: string) {
        this.queue = new Queue(queueName, {
            connection: {
                host: config.redis.host,
                port: config.redis.port,
                password: config.redis.password
            },
            defaultJobOptions: {
                removeOnComplete: 100,
                removeOnFail: 500,
                attempts: 3,
                backoff: {
                    type: 'exponential',
                    delay: 1000
                }
            }
        });

        this.queue.on('error', err => {
            logger.error({ err, queueName }, 'Queue connection error');
        });
    }

    /*
     * Add a new job to the queue.
     * @param name - The name of the job.
     * @param data - The data associated with the job.
     * @param options - Optional job options.
     * @return The added job.
     */
    async add(name: string, data: T, options?: JobsOptions): Promise<Job<T>> {
        if (
            (await this.queue
                .getJobCounts('waiting', 'delayed')
                .then(counts => counts.waiting + counts.delayed)) >=
            config.queue.save.maxQueueLength
        ) {
            throw new Error('Queue is full. Please try again later.');
        }
        return this.queue.add(name, data, options);
    }

    async getJob(jobId: string): Promise<Job<T> | undefined> {
        return this.queue.getJob(jobId);
    }

    async close() {
        await this.queue.close();
    }
}
