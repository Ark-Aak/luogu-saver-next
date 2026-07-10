import Router from 'koa-router';
import { Context, DefaultState } from 'koa';
import { requiresPermission } from '@/middlewares/authorization';
import { Permission } from '@/shared/permission';
import { DeletionRequestService } from '@/services/deletion-request.service';

const router = new Router<DefaultState, Context>({ prefix: '/deletion-request' });

router.post('/', requiresPermission(Permission.LOGIN), async (ctx: Context) => {
    const request = await DeletionRequestService.createRequest(ctx.user.id, ctx.request.body || {});
    ctx.success(request);
});

router.get('/mine', requiresPermission(Permission.LOGIN), async (ctx: Context) => {
    const result = await DeletionRequestService.listMyRequests(
        ctx.user.id,
        ctx.query.page,
        ctx.query.pageSize
    );
    ctx.success(result);
});

export default router;
