import Router from 'koa-router';
import { Context, DefaultState } from 'koa';
import { SearchService } from '@/services/search.service';
import { logger } from '@/lib/logger';

const router = new Router<DefaultState, Context>({ prefix: '/search' });

function parseOptionalNumber(value: unknown): number | undefined {
    if (value === undefined) return undefined;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
}

router.get('/articles', async (ctx: Context) => {
    try {
        const result = await SearchService.searchArticles({
            q: typeof ctx.query.q === 'string' ? ctx.query.q : '',
            page: Math.max(1, Number(ctx.query.page) || 1),
            limit: Math.min(50, Math.max(1, Number(ctx.query.limit) || 10)),
            category: parseOptionalNumber(ctx.query.category),
            authorId: parseOptionalNumber(ctx.query.authorId)
        });

        ctx.success(result);
    } catch (error) {
        logger.error({ error }, 'Failed to search articles');
        ctx.fail(500, error instanceof Error ? error.message : 'Failed to search articles');
    }
});

export default router;
