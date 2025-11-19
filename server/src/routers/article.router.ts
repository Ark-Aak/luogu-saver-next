import Router from 'koa-router';

const router = new Router({ prefix: '/article' });

import { ArticleService } from '@/services/article.service';
import { Context } from 'koa';
import { truncateUtf8 } from "@/utils/string";

router.get('/query/:id', async (ctx: Context) => {
    const articleId = ctx.params.id;
    const article = await ArticleService.getArticleById(articleId);
    if (article) {
        ctx.success(article);
    } else {
        ctx.fail(404, 'Article not found');
    }
});

router.get('/recent', async (ctx: Context) => {
    const count = parseInt(ctx.query.count as string) || 20;
    const updatedAfterStr = ctx.query.updatedAfter as string | undefined;
    const updatedAfter = updatedAfterStr ? new Date(updatedAfterStr) : undefined;

    const articles = await ArticleService.getRecentArticles(count, updatedAfter);
    const sanitizedArticles = articles.map((article) => ({
        ...article,
        content: truncateUtf8(article.content, 300)
    }));
    ctx.success(sanitizedArticles);
});

export default router;