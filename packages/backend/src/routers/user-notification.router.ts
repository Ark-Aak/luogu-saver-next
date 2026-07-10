import Router from 'koa-router';
import { Context, DefaultState } from 'koa';
import { requiresPermission } from '@/middlewares/authorization';
import { Permission } from '@/shared/permission';
import { UserNotificationService } from '@/services/user-notification.service';

const router = new Router<DefaultState, Context>({ prefix: '/user-notification' });

router.get('/list', requiresPermission(Permission.LOGIN), async (ctx: Context) => {
    const result = await UserNotificationService.listNotifications(
        ctx.user.id,
        ctx.query.page,
        ctx.query.pageSize
    );
    ctx.success(result);
});

router.get('/unread-count', requiresPermission(Permission.LOGIN), async (ctx: Context) => {
    const count = await UserNotificationService.getUnreadCount(ctx.user.id);
    ctx.success({ count });
});

router.post('/read', requiresPermission(Permission.LOGIN), async (ctx: Context) => {
    const { ids } = (ctx.request.body || {}) as { ids?: unknown };
    const result = await UserNotificationService.markRead(ctx.user.id, ids);
    ctx.success(result);
});

router.post('/read-all', requiresPermission(Permission.LOGIN), async (ctx: Context) => {
    const result = await UserNotificationService.markAllRead(ctx.user.id);
    ctx.success(result);
});

export default router;
