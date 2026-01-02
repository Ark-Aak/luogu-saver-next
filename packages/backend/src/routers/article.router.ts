import Router from 'koa-router';
import { Context, DefaultState } from 'koa';

const router = new Router<DefaultState, Context>({ prefix: '/article' });

import { ArticleService } from '@/services/article.service';
import { truncateUtf8 } from '@/utils/string';
import { TrackingEvent } from '@/shared/event';
import { RecommendationService } from '@/services/recommendation.service';
import { ArticleHistoryService } from '@/services/article-history.service';

router.get('/query/:id', async (ctx: Context) => {
    try {
        const articleId = ctx.params.id;
        const article = await ArticleService.getArticleById(articleId);
        if (!article) {
            ctx.fail(404, 'Article not found');
            return;
        }
        await article.renderContent();
        if (ctx.track) ctx.track(TrackingEvent.VIEW_ARTICLE, articleId);
        if (article.deleted) {
            ctx.fail(403, article.deleteReason || 'Article has been deleted');
        } else {
            ctx.success(article);
        }
    } catch (error) {
        ctx.fail(500, 'Failed to retrieve article');
    }
});

router.get('/relevant/:id', async (ctx: Context) => {
    try {
        ctx.success(await RecommendationService.getRelevantArticle(ctx.params.id));
    } catch (error) {
        ctx.fail(500, 'Failed to retrieve relevant articles');
    }
});

router.get('/history/:id', async (ctx: Context) => {
    try {
        const history = await ArticleHistoryService.getHistoryByArticleId(ctx.params.id);
        ctx.success(history);
    } catch (error) {
        ctx.fail(500, 'Failed to retrieve article history');
    }
});

router.get('/recent', async (ctx: Context) => {
    try {
        const count = Math.min(100, Number(ctx.query.count) || 20);
        const updatedAfterStr = ctx.query.updated_after as string | undefined;
        const updatedAfter = updatedAfterStr ? new Date(updatedAfterStr) : undefined;
        const truncatedCount = Math.min(Number(ctx.query.truncated_count) || 200, 600);

        const articles = await Promise.all(
            (await ArticleService.getRecentArticles(count, updatedAfter)).map(async article => {
                await article.renderContent();
                return article;
            })
        );
        const sanitizedArticles = articles.map(article => ({
            ...article,
            content: article.content ? truncateUtf8(article.content, truncatedCount) : undefined
        }));
        ctx.success(sanitizedArticles);
    } catch (error) {
        ctx.fail(500, 'Failed to retrieve recent articles');
    }
});

router.get('/count', async (ctx: Context) => {
    try {
        const count = await ArticleService.getArticleCount();
        ctx.success({ count });
    } catch (error) {
        ctx.fail(500, 'Failed to retrieve article count');
    }
});

export default router;
