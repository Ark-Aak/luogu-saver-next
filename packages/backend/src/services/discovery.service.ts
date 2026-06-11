import {
    DiscoveredArticle,
    DiscoveredArticleSource,
    DiscoveredArticleStatus
} from '@/entities/discovered-article';
import { DiscoveryRun, DiscoveryRunStatus } from '@/entities/discovery-run';
import { WorkflowService } from '@/services/workflow.service';
import { TaskService } from '@/services/task.service';
import { ArticleDiscoveryBroadcaster } from '@/services/article-discovery-broadcaster.service';
import { DiscoverTarget, TaskType } from '@/shared/task';
import { isDuplicateKeyError } from '@/utils/db-errors';
import {
    findOneServiceEntity,
    getServiceRepository,
    saveServiceEntity
} from '@/services/helpers/repository.helper';
import { logger } from '@/lib/logger';

export type StartArticlePlazaDiscoveryInput = {
    maxPages?: number;
    forceUpdate?: boolean;
    includeCategories?: boolean;
};

export type ArticleDiscoveryInput = {
    runId: string;
    articleId: string;
    source: DiscoveredArticleSource;
    forceUpdate: boolean;
};

const ARTICLE_ID_PATTERN = /^[A-Za-z0-9]{1,8}$/;
const DEFAULT_MAX_PAGES = 50;
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
                    forceUpdate
                }
            });
            await TaskService.dispatchTask(task.id);
            taskIds.push(task.id);
        }

        ArticleDiscoveryBroadcaster.scheduleRunsUpdate(run.id);
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
        ArticleDiscoveryBroadcaster.scheduleRunsUpdate(runId);
    }

    static async hasActiveArticlePlazaRun() {
        const activeRun = await findOneServiceEntity<DiscoveryRun>(DiscoveryRun, {
            where: {
                seedUrl: 'https://www.luogu.com.cn/article',
                status: DiscoveryRunStatus.ACTIVE
            },
            select: ['id']
        });
        return Boolean(activeRun);
    }

    static async claimPage(runId: string, consumeBudget = true): Promise<boolean> {
        const claimed = await DiscoveryRun.transaction(async manager => {
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
        if (claimed && consumeBudget) ArticleDiscoveryBroadcaster.scheduleRunsUpdate(runId);
        return claimed;
    }

    static async finishPage(runId: string, hasContinuation: boolean) {
        if (hasContinuation) return;

        const changed = await DiscoveryRun.transaction(async manager => {
            const repo = manager.getRepository(DiscoveryRun);
            const run = await repo.findOne({
                where: { id: runId },
                lock: { mode: 'pessimistic_write' }
            });
            if (!run || run.status !== DiscoveryRunStatus.ACTIVE) return false;

            run.pendingPages = Math.max(0, run.pendingPages - 1);
            if (run.pendingPages === 0) {
                run.status = DiscoveryRunStatus.COMPLETED;
                run.finishedAt = new Date();
            }
            await repo.save(run);
            return true;
        });
        if (changed) ArticleDiscoveryBroadcaster.scheduleRunsUpdate(runId);
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
        ArticleDiscoveryBroadcaster.scheduleRunsUpdate(runId);
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
            ArticleDiscoveryBroadcaster.scheduleRunsUpdate(input.runId);
        } catch (error) {
            if (!isDuplicateKeyError(error)) throw error;
            await getServiceRepository<DiscoveredArticle>(DiscoveredArticle).update(
                { runId: input.runId, articleId: input.articleId },
                { lastSeenAt: new Date() }
            );
            ArticleDiscoveryBroadcaster.scheduleRunsUpdate(input.runId);
            return { created: false, reason: 'duplicate' };
        }

        try {
            const workflow = await WorkflowService.createWorkflowFromTemplate(
                'article-save-pipeline',
                {
                    targetId: input.articleId,
                    forceUpdate: input.forceUpdate
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
            ArticleDiscoveryBroadcaster.scheduleRunsUpdate(input.runId);
            return { created: true, workflowId: workflow.workflowId };
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            await getServiceRepository<DiscoveredArticle>(DiscoveredArticle).update(row.id, {
                status: DiscoveredArticleStatus.FAILED,
                reason: message.slice(0, 4000)
            });
            ArticleDiscoveryBroadcaster.scheduleRunsUpdate(input.runId);
            logger.error({ error, input }, 'Failed to create workflow for discovered article');
            return { created: false, reason: message };
        }
    }
}
