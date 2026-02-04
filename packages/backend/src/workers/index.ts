import { WorkerHost } from '@/workers/worker-host';
import { TaskProcessor } from '@/workers/task-processor';
import { PointGuard } from '@/lib/point-guard';
import { SaveTask, TaskType, UpdateTask } from '@/shared/task';
import { AiTask } from '@/shared/task';
import { QUEUE_NAMES } from '@/shared/constants';
import { logger } from '@/lib/logger';

import { ArticleHandler } from '@/workers/handlers/task/save/article.handler';
import { PasteHandler } from '@/workers/handlers/task/save/paste.handler';
import { SummaryHandler } from '@/workers/handlers/task/llm/summary.handler';
import { EmbeddingHandler } from '@/workers/handlers/task/llm/embedding.handler';
import { ChatHandler } from '@/workers/handlers/task/llm/chat.handler';
import { CensorHandler } from '@/workers/handlers/task/llm/censor.handler';
import { UpdateArticleSummaryHandler } from '@/workers/handlers/task/update/update-article-summary.handler';
import { UpdateArticleEmbeddingHandler } from '@/workers/handlers/task/update/update-article-embedding.handler';
import { UpdateCensorResultHandler } from '@/workers/handlers/task/update/update-censor-result';
import { config } from '@/config';
import { WorkerOptions } from 'bullmq';

export function bootstrap() {
    const saveTaskPointGuard = new PointGuard(
        'save_task_guard',
        config.queue.save.maxRequestToken,
        config.queue.save.regenerationInterval
    );
    const saveProcessor = new TaskProcessor<SaveTask>();
    const aiTaskPointGuard = new PointGuard(
        'ai_task_guard',
        config.queue.ai.maxRequestToken,
        config.queue.ai.regenerationInterval
    );
    const aiProcessor = new TaskProcessor<AiTask>();
    const updateProcessor = new TaskProcessor<UpdateTask>();

    saveProcessor.registerHandler(new ArticleHandler());
    saveProcessor.registerHandler(new PasteHandler());

    aiProcessor.registerHandler(new SummaryHandler());
    aiProcessor.registerHandler(new EmbeddingHandler());
    aiProcessor.registerHandler(new ChatHandler());
    aiProcessor.registerHandler(new CensorHandler());

    updateProcessor.registerHandler(new UpdateArticleSummaryHandler());
    updateProcessor.registerHandler(new UpdateArticleEmbeddingHandler());
    updateProcessor.registerHandler(new UpdateCensorResultHandler());

    const saveWorkerHost = new WorkerHost<SaveTask>(
        QUEUE_NAMES[TaskType.SAVE],
        saveProcessor,
        saveTaskPointGuard,
        {
            concurrency: config.queue.save.concurrencyLimit
        } as WorkerOptions
    );

    const aiWorkerHost = new WorkerHost<AiTask>(
        QUEUE_NAMES[TaskType.LLM],
        aiProcessor,
        aiTaskPointGuard,
        {
            concurrency: config.queue.ai.concurrencyLimit
        } as WorkerOptions
    );

    const updateWorkerHost = new WorkerHost<UpdateTask>(
        QUEUE_NAMES[TaskType.UPDATE],
        updateProcessor,
        null,
        {
            concurrency: config.queue.update.concurrencyLimit
        } as WorkerOptions
    );

    process.on('SIGINT', async () => {
        logger.info('Shutting down workers...');
        await saveWorkerHost.close();
        await aiWorkerHost.close();
        await updateWorkerHost.close();
        process.exit(0);
    });

    process.on('SIGTERM', async () => {
        logger.info('Shutting down workers...');
        await saveWorkerHost.close();
        await aiWorkerHost.close();
        await updateWorkerHost.close();
        process.exit(0);
    });

    logger.info('Worker hosts initialized and running.');
}
