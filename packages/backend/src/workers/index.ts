import { WorkerHost } from '@/workers/worker-host';
import { TaskProcessor } from '@/workers/task-processor';
import { PointGuard } from '@/lib/point-guard';
import { SaveTask, TaskType } from '@/shared/task';
import { QUEUE_NAMES } from '@/shared/constants';
import { logger } from '@/lib/logger';

import { ArticleHandler } from '@/workers/handlers/task/article.handler';
import { PasteHandler } from '@/workers/handlers/task/paste.handler';
import { config } from '@/config';
import { WorkerOptions } from 'bullmq';

export function bootstrap() {
    const saveTaskPointGuard = new PointGuard('save_task_guard', 100, 100);
    const saveProcessor = new TaskProcessor<SaveTask>();

    saveProcessor.registerHandler(new ArticleHandler());
    saveProcessor.registerHandler(new PasteHandler());

    const saveWorkerHost = new WorkerHost<SaveTask>(
        QUEUE_NAMES[TaskType.SAVE],
        saveProcessor,
        saveTaskPointGuard,
        {
            concurrency: config.queue.concurrencyLimit
        } as WorkerOptions
    );

    process.on('SIGINT', async () => {
        logger.info('Shutting down workers...');
        await saveWorkerHost.close();
        process.exit(0);
    });

    process.on('SIGTERM', async () => {
        logger.info('Shutting down workers...');
        await saveWorkerHost.close();
        process.exit(0);
    });

    logger.info('Worker hosts initialized and running.');
}
