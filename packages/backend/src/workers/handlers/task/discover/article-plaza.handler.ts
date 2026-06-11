import { Job } from 'bullmq';
import { DiscoverTask, DiscoverTarget, TaskType } from '@/shared/task';
import { TaskHandler, WorkflowResult } from '@/workers/types';
import { fetch } from '@/utils/fetch';
import { C3vkMode } from '@/shared/c3vk';
import { DiscoveredArticleSource } from '@/entities/discovered-article';
import { DiscoveryService } from '@/services/discovery.service';
import { TaskService } from '@/services/task.service';
import { logger } from '@/lib/logger';

type ArticleListResponse = {
    data?: {
        articles?: {
            perPage?: number;
            count?: number;
            result?: Array<{ lid?: unknown }>;
        };
    };
};

function buildArticlePlazaUrl(page: number, category?: number | null) {
    const url = new URL('https://www.luogu.com.cn/article');
    if (category !== null && category !== undefined)
        url.searchParams.set('category', String(category));
    if (page > 1) url.searchParams.set('page', String(page));
    return url.toString();
}

function extractArticleIds(resp: ArticleListResponse) {
    const ids: string[] = [];
    const seen = new Set<string>();
    const items = resp?.data?.articles?.result;
    if (!Array.isArray(items)) return ids;

    for (const item of items) {
        const id = typeof item?.lid === 'string' ? item.lid.trim() : '';
        if (!/^[A-Za-z0-9]{1,8}$/.test(id) || seen.has(id)) continue;
        seen.add(id);
        ids.push(id);
    }
    return ids;
}

export class ArticlePlazaDiscoveryHandler implements TaskHandler<DiscoverTask> {
    public taskType = `${TaskType.DISCOVER}:${DiscoverTarget.ARTICLE_PLAZA}`;

    public async handle(
        task: DiscoverTask,
        job: Job<DiscoverTask>
    ): Promise<WorkflowResult<{ text: string; articleIds: string[]; nextTaskId?: string }>> {
        const metadata = task.payload.metadata;
        const runId = metadata.runId;
        const page = Math.max(1, Math.trunc(Number(metadata.page) || 1));
        const category =
            metadata.category === null || metadata.category === undefined
                ? null
                : Math.trunc(Number(metadata.category));

        const isRetry = job.attemptsMade > 0;
        if (!(await DiscoveryService.claimPage(runId, !isRetry))) {
            await DiscoveryService.finishPage(runId, false);
            return {
                skipNextStep: false,
                data: {
                    text: 'Discovery run is inactive or page budget is exhausted',
                    articleIds: []
                }
            };
        }

        const url = buildArticlePlazaUrl(page, category);
        await job.updateProgress(`Fetching ${url}`);

        try {
            const resp: ArticleListResponse = await fetch(url, C3vkMode.MODERN);
            const articleIds = extractArticleIds(resp);

            for (const articleId of articleIds) {
                await DiscoveryService.discoverArticle({
                    runId,
                    articleId,
                    source: DiscoveredArticleSource.PLAZA,
                    forceUpdate: metadata.forceUpdate === true
                });
            }

            let nextTaskId: string | undefined;
            if (articleIds.length > 0 && page < (metadata.maxPages ?? 50)) {
                const nextTask = await TaskService.createTask(TaskType.DISCOVER, {
                    target: DiscoverTarget.ARTICLE_PLAZA,
                    targetId: task.payload.targetId,
                    metadata: {
                        ...metadata,
                        page: page + 1,
                        category
                    }
                });
                await TaskService.dispatchTask(nextTask.id);
                nextTaskId = nextTask.id;
            }

            logger.info(
                { runId, page, category, articleCount: articleIds.length, nextTaskId },
                'Article plaza discovery page processed'
            );

            await DiscoveryService.finishPage(runId, Boolean(nextTaskId));

            return {
                skipNextStep: false,
                data: {
                    text: `Discovered ${articleIds.length} article(s) from ${url}`,
                    articleIds,
                    nextTaskId
                }
            };
        } catch (error) {
            const attempts = job.opts.attempts || 1;
            const isFinalAttempt = job.attemptsMade + 1 >= attempts;
            if (isFinalAttempt) {
                await DiscoveryService.markPageFailed(runId, error);
                await DiscoveryService.finishPage(runId, false);
            }
            throw error;
        }
    }
}
