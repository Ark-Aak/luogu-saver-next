import { In } from 'typeorm';
import {
    DiscoveredArticle,
    DiscoveredArticleSource,
    DiscoveredArticleStatus
} from '@/entities/discovered-article';
import { DiscoveredArticleEdge } from '@/entities/discovered-article-edge';
import { DiscoveryRun, DiscoveryRunStatus } from '@/entities/discovery-run';
import { Article } from '@/entities/article';
import { WorkflowService } from '@/services/workflow.service';
import { TaskService } from '@/services/task.service';
import { DiscoverTarget, TaskType, type CrawlMetadata } from '@/shared/task';
import { isDuplicateKeyError } from '@/utils/db-errors';
import {
    findOneServiceEntity,
    getServiceRepository,
    saveServiceEntity
} from '@/services/helpers/repository.helper';
import { logger } from '@/lib/logger';
import { ArticleCrawlSaveRecentlyQueuedError } from '@/services/article-crawl-save-dedupe.service';

export type StartArticlePlazaDiscoveryInput = {
    maxPages?: number;
    maxDepth?: number;
    maxChildrenPerArticle?: number;
    recursive?: boolean;
    forceUpdate?: boolean;
    includeCategories?: boolean;
};

export type ArticleDiscoveryInput = {
    runId: string;
    articleId: string;
    source: DiscoveredArticleSource;
    sourceArticleId?: string | null;
    depth: number;
    maxDepth: number;
    maxChildrenPerArticle: number;
    recursive: boolean;
    forceUpdate: boolean;
};

const ARTICLE_ID_PATTERN = /^[A-Za-z0-9]{1,8}$/;
const DEFAULT_MAX_PAGES = 50;
const DEFAULT_MAX_DEPTH = 2;
const DEFAULT_MAX_CHILDREN_PER_ARTICLE = 20;
const ARTICLE_CATEGORIES = [1, 2, 3, 4, 5, 6, 7, 8];

function clampInt(value: unknown, fallback: number, min: number, max: number) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return fallback;
    return Math.min(max, Math.max(min, Math.trunc(parsed)));
}

function normalizeBool(value: unknown, fallback: boolean) {
    return typeof value === 'boolean' ? value : fallback;
}

export class DiscoveryService {
    static async startArticlePlazaDiscovery(input: StartArticlePlazaDiscoveryInput = {}) {
        const maxPages = clampInt(input.maxPages, DEFAULT_MAX_PAGES, 1, 1000);
        const maxDepth = clampInt(input.maxDepth, DEFAULT_MAX_DEPTH, 0, 10);
        const maxChildrenPerArticle = clampInt(
            input.maxChildrenPerArticle,
            DEFAULT_MAX_CHILDREN_PER_ARTICLE,
            0,
            200
        );
        const recursive = normalizeBool(input.recursive, true);
        const forceUpdate = normalizeBool(input.forceUpdate, false);
        const includeCategories = normalizeBool(input.includeCategories, true);
        const seeds: Array<number | null> = includeCategories
            ? [null, ...ARTICLE_CATEGORIES]
            : [null];

        const run = await saveServiceEntity<DiscoveryRun>(
            DiscoveryRun,
            DiscoveryRun.create({
                seedUrl: 'https://www.luogu.com.cn/article',
                status: DiscoveryRunStatus.ACTIVE,
                maxPages,
                maxDepth,
                maxChildrenPerArticle,
                recursive,
                forceUpdate,
                visitedPages: 0,
                failedPages: 0,
                pendingPages: seeds.length,
                discoveredArticles: 0,
                createdWorkflows: 0,
                lastError: null,
                finishedAt: null
            })
        );

        const taskIds: string[] = [];

        for (const category of seeds) {
            const task = await TaskService.createTask(TaskType.DISCOVER, {
                target: DiscoverTarget.ARTICLE_PLAZA,
                targetId: 'article-plaza',
                metadata: {
                    runId: run.id,
                    page: 1,
                    category,
                    maxPages,
                    maxDepth,
                    maxChildrenPerArticle,
                    recursive,
                    forceUpdate
                }
            });
            await TaskService.dispatchTask(task.id);
            taskIds.push(task.id);
        }

        return { run, taskIds };
    }

    static async getRunById(runId: string) {
        return findOneServiceEntity<DiscoveryRun>(DiscoveryRun, { where: { id: runId } });
    }

    static async listRuns(limit = 20) {
        return getServiceRepository<DiscoveryRun>(DiscoveryRun).find({
            order: { createdAt: 'DESC' },
            take: clampInt(limit, 20, 1, 100)
        });
    }

    static async stopRun(runId: string) {
        await getServiceRepository<DiscoveryRun>(DiscoveryRun).update(
            { id: runId },
            { status: DiscoveryRunStatus.STOPPED, finishedAt: new Date(), pendingPages: 0 }
        );
    }

    static async claimPage(runId: string, consumeBudget = true): Promise<boolean> {
        return DiscoveryRun.transaction(async manager => {
            const repo = manager.getRepository(DiscoveryRun);
            const run = await repo.findOne({
                where: { id: runId },
                lock: { mode: 'pessimistic_write' }
            });
            if (!run || run.status !== DiscoveryRunStatus.ACTIVE) return false;
            if (!consumeBudget) return true;
            if (run.visitedPages >= run.maxPages) {
                return false;
            }
            run.visitedPages += 1;
            await repo.save(run);
            return true;
        });
    }

    static async finishPage(runId: string, hasContinuation: boolean) {
        if (hasContinuation) return;

        await DiscoveryRun.transaction(async manager => {
            const repo = manager.getRepository(DiscoveryRun);
            const run = await repo.findOne({
                where: { id: runId },
                lock: { mode: 'pessimistic_write' }
            });
            if (!run || run.status !== DiscoveryRunStatus.ACTIVE) return;

            run.pendingPages = Math.max(0, run.pendingPages - 1);
            if (run.pendingPages === 0) {
                run.status = DiscoveryRunStatus.COMPLETED;
                run.finishedAt = new Date();
            }
            await repo.save(run);
        });
    }

    static async markPageFailed(runId: string, error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        await getServiceRepository<DiscoveryRun>(DiscoveryRun).increment(
            { id: runId },
            'failedPages',
            1
        );
        await getServiceRepository<DiscoveryRun>(DiscoveryRun).update(
            { id: runId },
            { lastError: message.slice(0, 4000) }
        );
    }

    static async claimArticleEdge(
        runId: string,
        sourceArticleId: string,
        targetArticleId: string,
        depth: number
    ) {
        if (
            !ARTICLE_ID_PATTERN.test(sourceArticleId) ||
            !ARTICLE_ID_PATTERN.test(targetArticleId) ||
            sourceArticleId === targetArticleId
        ) {
            return false;
        }

        try {
            await saveServiceEntity<DiscoveredArticleEdge>(
                DiscoveredArticleEdge,
                DiscoveredArticleEdge.create({
                    runId,
                    sourceArticleId,
                    targetArticleId,
                    depth,
                    lastSeenAt: new Date()
                })
            );
            return true;
        } catch (error) {
            if (!isDuplicateKeyError(error)) throw error;
            await getServiceRepository<DiscoveredArticleEdge>(DiscoveredArticleEdge).update(
                { runId, sourceArticleId, targetArticleId },
                { lastSeenAt: new Date() }
            );
            return false;
        }
    }

    static async discoverArticle(input: ArticleDiscoveryInput) {
        if (!ARTICLE_ID_PATTERN.test(input.articleId)) {
            return { created: false, reason: 'invalid_article_id' };
        }

        const run = await this.getRunById(input.runId);
        if (!run || run.status !== DiscoveryRunStatus.ACTIVE) {
            return { created: false, reason: 'run_inactive' };
        }

        let row: DiscoveredArticle;
        try {
            row = await saveServiceEntity<DiscoveredArticle>(
                DiscoveredArticle,
                DiscoveredArticle.create({
                    runId: input.runId,
                    articleId: input.articleId,
                    source: input.source,
                    sourceArticleId: input.sourceArticleId ?? null,
                    depth: input.depth,
                    status: DiscoveredArticleStatus.DISCOVERED,
                    workflowId: null,
                    reason: null,
                    lastSeenAt: new Date()
                })
            );
            await getServiceRepository<DiscoveryRun>(DiscoveryRun).increment(
                { id: input.runId },
                'discoveredArticles',
                1
            );
        } catch (error) {
            if (!isDuplicateKeyError(error)) throw error;
            await getServiceRepository<DiscoveredArticle>(DiscoveredArticle).update(
                { runId: input.runId, articleId: input.articleId },
                { lastSeenAt: new Date() }
            );
            return { created: false, reason: 'duplicate' };
        }

        try {
            const workflow = await WorkflowService.createWorkflowFromTemplate(
                'article-save-pipeline',
                {
                    targetId: input.articleId,
                    forceUpdate: input.forceUpdate,
                    crawl: {
                        enabled: input.recursive,
                        runId: input.runId,
                        depth: input.depth,
                        maxDepth: input.maxDepth,
                        maxChildrenPerArticle: input.maxChildrenPerArticle,
                        sourceArticleId: input.sourceArticleId ?? null,
                        forceUpdate: input.forceUpdate
                    } satisfies CrawlMetadata
                }
            );
            await getServiceRepository<DiscoveredArticle>(DiscoveredArticle).update(row.id, {
                status: DiscoveredArticleStatus.WORKFLOW_CREATED,
                workflowId: workflow.workflowId,
                reason: null
            });
            await getServiceRepository<DiscoveryRun>(DiscoveryRun).increment(
                { id: input.runId },
                'createdWorkflows',
                1
            );
            return { created: true, workflowId: workflow.workflowId };
        } catch (error) {
            const isCrawlDedupe = error instanceof ArticleCrawlSaveRecentlyQueuedError;
            const message = isCrawlDedupe
                ? 'crawl_save_deduped'
                : error instanceof Error
                  ? error.message
                  : String(error);
            const status = isCrawlDedupe
                ? DiscoveredArticleStatus.SKIPPED
                : DiscoveredArticleStatus.FAILED;
            await getServiceRepository<DiscoveredArticle>(DiscoveredArticle).update(row.id, {
                status,
                reason: message.slice(0, 4000)
            });
            if (status === DiscoveredArticleStatus.FAILED) {
                logger.error({ error, input }, 'Failed to create workflow for discovered article');
            }
            return { created: false, reason: message };
        }
    }

    static async findArticleIds(ids: string[]) {
        if (ids.length === 0) return new Set<string>();
        const articles = await getServiceRepository<Article>(Article).find({
            where: { id: In(ids) },
            select: ['id']
        });
        return new Set(articles.map(article => article.id));
    }
}
