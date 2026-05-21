import { WorkerHost } from '@/workers/worker-host';
import { TaskProcessor } from '@/workers/task-processor';
import { PointGuard } from '@/lib/point-guard';
import { RagTask, ReadTask, SaveTask, SearchTask, TaskType, UpdateTask } from '@/shared/task';
import { AiTask } from '@/shared/task';
import { QUEUE_NAMES } from '@/shared/constants';
import { logger } from '@/lib/logger';

import { ArticleHandler } from '@/workers/handlers/task/save/article.handler';
import { PasteHandler } from '@/workers/handlers/task/save/paste.handler';
import { ProfileHandler } from '@/workers/handlers/task/save/profile.handler';
import { SummaryHandler } from '@/workers/handlers/task/llm/summary.handler';
import { EmbeddingHandler } from '@/workers/handlers/task/llm/embedding.handler';
import { ChatHandler } from '@/workers/handlers/task/llm/chat.handler';
import { CensorHandler } from '@/workers/handlers/task/llm/censor.handler';
import { UpdateArticleSummaryHandler } from '@/workers/handlers/task/update/update-article-summary.handler';
import { UpdateArticleSummaryRebuildHandler } from '@/workers/handlers/task/update/update-article-summary-rebuild.handler';
import { UpdateArticleEmbeddingHandler } from '@/workers/handlers/task/update/update-article-embedding.handler';
import { UpdateCensorResultHandler } from '@/workers/handlers/task/update/update-censor-result';
import { UpdateSearchIndexHandler } from '@/workers/handlers/task/update/update-search-index.handler';
import { UpdateSearchReindexHandler } from '@/workers/handlers/task/update/update-search-reindex.handler';
import { ArticleSearchHandler } from '@/workers/handlers/task/search/article-search.handler';
import { VectorSearchHandler } from '@/workers/handlers/task/search/vector-search.handler';
import { ReadTextHandler } from '@/workers/handlers/task/read/read-text.handler';
import { ReadArticleHandler } from '@/workers/handlers/task/read/read-article.handler';
import { ReadPasteHandler } from '@/workers/handlers/task/read/read-paste.handler';
import { RagContextHandler } from '@/workers/handlers/task/rag/rag-context.handler';
import { RagAnswerHandler } from '@/workers/handlers/task/rag/rag-answer.handler';
import { config } from '@/config';
import { WorkerOptions } from 'bullmq';
import { FlowManager } from './flow-manager';

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
    const searchProcessor = new TaskProcessor<SearchTask>();
    const readProcessor = new TaskProcessor<ReadTask>();
    const ragProcessor = new TaskProcessor<RagTask>();

    saveProcessor.registerHandler(new ArticleHandler());
    saveProcessor.registerHandler(new PasteHandler());
    saveProcessor.registerHandler(new ProfileHandler());

    aiProcessor.registerHandler(new SummaryHandler());
    aiProcessor.registerHandler(new EmbeddingHandler());
    aiProcessor.registerHandler(new ChatHandler());
    aiProcessor.registerHandler(new CensorHandler());

    updateProcessor.registerHandler(new UpdateArticleSummaryHandler());
    updateProcessor.registerHandler(new UpdateArticleSummaryRebuildHandler());
    updateProcessor.registerHandler(new UpdateArticleEmbeddingHandler());
    updateProcessor.registerHandler(new UpdateCensorResultHandler());
    updateProcessor.registerHandler(new UpdateSearchIndexHandler());
    updateProcessor.registerHandler(new UpdateSearchReindexHandler());

    searchProcessor.registerHandler(new ArticleSearchHandler());
    searchProcessor.registerHandler(new VectorSearchHandler());

    readProcessor.registerHandler(new ReadTextHandler());
    readProcessor.registerHandler(new ReadArticleHandler());
    readProcessor.registerHandler(new ReadPasteHandler());

    ragProcessor.registerHandler(new RagContextHandler());
    ragProcessor.registerHandler(new RagAnswerHandler());

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
    const searchWorkerHost = new WorkerHost<SearchTask>(
        QUEUE_NAMES[TaskType.SEARCH],
        searchProcessor,
        null,
        {
            concurrency: config.queue.update.concurrencyLimit
        } as WorkerOptions
    );
    const readWorkerHost = new WorkerHost<ReadTask>(
        QUEUE_NAMES[TaskType.READ],
        readProcessor,
        null,
        {
            concurrency: config.queue.update.concurrencyLimit
        } as WorkerOptions
    );
    const ragWorkerHost = new WorkerHost<RagTask>(QUEUE_NAMES[TaskType.RAG], ragProcessor, null, {
        concurrency: config.queue.ai.concurrencyLimit
    } as WorkerOptions);

    const closeWorkers = async () => {
        logger.info('Shutting down workers...');
        await Promise.all([
            saveWorkerHost.close(),
            aiWorkerHost.close(),
            updateWorkerHost.close(),
            searchWorkerHost.close(),
            readWorkerHost.close(),
            ragWorkerHost.close(),
            FlowManager.closeQueueEvents()
        ]);
    };

    process.on('SIGINT', async () => {
        await closeWorkers();
        process.exit(0);
    });

    process.on('SIGTERM', async () => {
        await closeWorkers();
        process.exit(0);
    });

    logger.info('Worker hosts initialized and running.');

    FlowManager.setupQueueEvents();
    logger.info('FlowManager queue events set up.');
}
