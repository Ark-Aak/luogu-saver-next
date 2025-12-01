import Router from 'koa-router';
import { Context, DefaultState } from 'koa';

const router = new Router<DefaultState, Context>({ prefix: '/article' });

import { ArticleService } from '@/services/article.service';
import { truncateUtf8 } from "@/utils/string";
import { TrackingEvents } from "@/constants/tracking-events";
import { RecommendationService } from "@/services/recommendation.service";

router.get('/query/:id', async (ctx: Context) => {
    const articleId = ctx.params.id;
    const article = await ArticleService.getArticleById(articleId);
    await article?.loadRelationships();
    if (ctx.track) ctx.track(TrackingEvents.VIEW_ARTICLE, articleId);
    if (article) {
        if (article.deleted) {
            ctx.fail(403, article.deletedReason);
        }
        else {
            ctx.success(article);
        }
    }
    else {
        ctx.fail(404, 'Article not found');
    }
});

router.get('/relevant/:id', async (ctx: Context) => {
    ctx.success({ relevant: await RecommendationService.getRelevantArticle(ctx.params.id) });
});

router.get('/recent', async (ctx: Context) => {
    const count = Math.min(100, Number(ctx.query.count) || 20);
    const updatedAfterStr = ctx.query.updated_after as string | undefined;
    const updatedAfter = updatedAfterStr ? new Date(updatedAfterStr) : undefined;
    const truncatedCount = Math.min(Number(ctx.query.truncated_count) || 200, 600);

    const articles = await Promise.all(
        (await ArticleService.getRecentArticles(count, updatedAfter))
            .map(async article => { await article.loadRelationships(); return article; })
    );
    const sanitizedArticles = articles.map((article) => ({
        ...article,
        content: article.content ? truncateUtf8(article.content, truncatedCount) : undefined
    }));
    ctx.success(sanitizedArticles);
});

router.get('/count', async (ctx: Context) => {
    const count = await ArticleService.getArticleCount();
    ctx.success({ count });
});

export default router;