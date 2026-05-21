import Router from 'koa-router';
import { Context, DefaultState } from 'koa';
import { Permission, ROLE_ADMIN } from '@/shared/permission';
import { VerificationService } from '@/services/verification.service';
import { requiresPermission } from '@/middlewares/authorization';
import { RegisteredUser } from '@/entities/registered-user';
import { RegisteredUserService } from '@/services/registered-user.service';

const router = new Router<DefaultState, Context>({ prefix: '/token' });

router.post('/verify', async (ctx: Context) => {
    const { uid } = ctx.request.body as any;

    if (!uid) {
        ctx.fail(400, 'UID is required');
        return;
    }

    const result = await VerificationService.prepareForLuogu(uid);
    ctx.success(result);
});

router.post('/create', async (ctx: Context) => {
    ctx.fail(410, 'Token creation has moved to CP OAuth login');
});

router.post('/permission', async (ctx: Context) => {
    if (!ctx.user || ctx.user.role !== ROLE_ADMIN) {
        ctx.fail(403, 'Admin permission required');
        return;
    }

    const { uid, role } = ctx.request.body as any;

    if (!uid || role === undefined) {
        ctx.fail(400, 'UID and role are required');
        return;
    }

    if (uid === ctx.user.id) {
        ctx.fail(400, 'Cannot change your own role');
        return;
    }

    try {
        const registeredUser = await RegisteredUser.findOne({ where: { id: uid } });
        if (!registeredUser) {
            ctx.fail(404, 'Registered user not found');
            return;
        }

        await RegisteredUserService.updateRole(uid, role);
        ctx.success({ uid, role });
    } catch (error) {
        ctx.fail(500, error instanceof Error ? error.message : 'Unknown error');
    }
});

router.get('/inspect', requiresPermission(Permission.LOGIN), async (ctx: Context) => {
    try {
        const registeredUser = await RegisteredUser.findOne({ where: { id: ctx.user.id } });
        if (!registeredUser) {
            ctx.fail(404, 'Registered user not found');
            return;
        }
        ctx.success({
            uid: registeredUser.id,
            role: registeredUser.role,
            createdAt: registeredUser.createdAt
        });
    } catch (error) {
        ctx.fail(500, error instanceof Error ? error.message : 'Unknown error');
    }
});

export default router;
