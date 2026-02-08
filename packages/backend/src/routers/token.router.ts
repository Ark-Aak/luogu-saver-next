import Router from 'koa-router';
import { Context, DefaultState } from 'koa';
import crypto from 'crypto';
import { Token } from '@/entities/token';
import { Permission, ROLE_ADMIN, ROLE_DEFAULT } from '@/shared/permission';
import { VerificationService } from '@/services/verification.service';
import { requiresPermission } from '@/middlewares/authorization';

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
    const { uid, pasteId } = ctx.request.body as any;

    if (!uid) {
        ctx.fail(400, 'UID is required');
        return;
    }

    if (!pasteId || pasteId.length !== 8) {
        ctx.fail(400, 'Valid pasteId is required for verification');
        return;
    }

    const isVerified = await VerificationService.verifyByLuogu(uid, pasteId);
    if (!isVerified) {
        ctx.fail(
            400,
            'Verification failed. Please ensure the paste exists and contains the correct verification code.'
        );
        return;
    }

    try {
        const existing = await Token.findOne({ where: { uid } });
        if (existing) {
            ctx.fail(400, 'Token already exists for this UID');
            return;
        }

        const id = crypto.randomBytes(16).toString('hex');
        const token = new Token();
        token.id = id;
        token.uid = uid;
        token.role = ROLE_DEFAULT;
        await token.save();
        ctx.success({ token: id, role: ROLE_DEFAULT });
    } catch (error) {
        ctx.fail(500, error instanceof Error ? error.message : 'Unknown error');
    }
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
        const token = await Token.findOne({ where: { uid } });
        if (!token) {
            ctx.fail(404, 'Token not found for UID');
            return;
        }

        token.role = role;
        await token.save();
        ctx.success({ uid, role });
    } catch (error) {
        ctx.fail(500, error instanceof Error ? error.message : 'Unknown error');
    }
});

router.get('/inspect', requiresPermission(Permission.LOGIN), async (ctx: Context) => {
    try {
        const token = await Token.findOne({ where: { uid: ctx.user.id } });
        if (!token) {
            ctx.fail(404, 'Token not found for your UID');
            return;
        }
        ctx.success({ uid: token.uid, role: token.role, createdAt: token.createdAt });
    } catch (error) {
        ctx.fail(500, error instanceof Error ? error.message : 'Unknown error');
    }
});

export default router;
