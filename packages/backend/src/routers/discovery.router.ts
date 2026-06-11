import Router from 'koa-router';
import { Context, DefaultState } from 'koa';
import { requiresPermission } from '@/middlewares/authorization';
import { Permission } from '@/shared/permission';
import { DiscoveryService } from '@/services/discovery.service';
import { logger } from '@/lib/logger';

const router = new Router<DefaultState, Context>({ prefix: '/discover' });

router.post(
    '/article-plaza/start',
    requiresPermission(Permission.MANAGE_DISCOVERY),
    async (ctx: Context) => {
        try {
            const result = await DiscoveryService.startArticlePlazaDiscovery(
                ctx.request.body || {}
            );
            ctx.success({
                runId: result.run.id,
                taskIds: result.taskIds,
                run: result.run
            });
        } catch (error) {
            logger.error({ error }, 'Failed to start article plaza discovery');
            ctx.fail(
                500,
                error instanceof Error ? error.message : 'Failed to start article plaza discovery'
            );
        }
    }
);

router.get('/runs', requiresPermission(Permission.MANAGE_DISCOVERY), async (ctx: Context) => {
    const limit = Number(ctx.query.limit) || 20;
    ctx.success(await DiscoveryService.listRuns(limit));
});

router.get('/runs/:id', requiresPermission(Permission.MANAGE_DISCOVERY), async (ctx: Context) => {
    const run = await DiscoveryService.getRunById(ctx.params.id);
    if (!run) {
        ctx.fail(404, 'Discovery run not found');
        return;
    }
    ctx.success(run);
});

router.post(
    '/runs/:id/stop',
    requiresPermission(Permission.MANAGE_DISCOVERY),
    async (ctx: Context) => {
        const run = await DiscoveryService.getRunById(ctx.params.id);
        if (!run) {
            ctx.fail(404, 'Discovery run not found');
            return;
        }
        await DiscoveryService.stopRun(ctx.params.id);
        ctx.success({ runId: ctx.params.id });
    }
);

export default router;
