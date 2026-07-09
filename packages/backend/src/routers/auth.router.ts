import Router from 'koa-router';
import { Context, DefaultState } from 'koa';
import { config } from '@/config';
import { AuthService } from '@/services/auth.service';
import { RegisteredUserService } from '@/services/registered-user.service';
import { logger } from '@/lib/logger';

const router = new Router<DefaultState, Context>({ prefix: '/auth' });

function getFrontendCallbackUrl(params: Record<string, string | number | undefined>) {
    const callbackUrl = new URL(config.auth.cpOAuth.frontendRedirectUri, 'http://localhost');
    for (const [key, value] of Object.entries(params)) {
        if (value !== undefined) callbackUrl.searchParams.set(key, String(value));
    }
    return config.auth.cpOAuth.frontendRedirectUri.startsWith('http')
        ? callbackUrl.toString()
        : `${callbackUrl.pathname}${callbackUrl.search}`;
}

router.get('/cp/login', async (ctx: Context) => {
    try {
        ctx.redirect(await AuthService.createAuthorizationUrl(ctx.query.redirect));
    } catch (error) {
        logger.error({ error }, 'Failed to create CP OAuth authorization URL');
        ctx.fail(500, 'Failed to start CP OAuth login');
    }
});

router.get('/cp/callback', async (ctx: Context) => {
    const error = ctx.query.error as string | undefined;
    if (error) {
        ctx.redirect(
            getFrontendCallbackUrl({
                error,
                message: (ctx.query.error_description as string | undefined) || error
            })
        );
        return;
    }

    const code = ctx.query.code as string | undefined;
    const state = ctx.query.state as string | undefined;

    if (!code || !state) {
        ctx.redirect(getFrontendCallbackUrl({ error: 'invalid_request' }));
        return;
    }

    try {
        const result = await AuthService.completeCpOAuthLogin(code, state);
        const exchange = await AuthService.storeExchangeToken(result);
        ctx.redirect(
            getFrontendCallbackUrl({
                exchange,
                redirect: result.redirect
            })
        );
    } catch (callbackError) {
        logger.error({ callbackError }, 'Failed to complete CP OAuth login');
        ctx.redirect(
            getFrontendCallbackUrl({
                error: 'login_failed',
                message:
                    callbackError instanceof Error
                        ? callbackError.message
                        : 'Failed to complete CP OAuth login'
            })
        );
    }
});

router.get('/me', async (ctx: Context) => {
    if (!ctx.user || ctx.user.id === undefined) {
        ctx.fail(401, 'Unauthorized');
        return;
    }

    const registeredUser = await RegisteredUserService.getById(ctx.user.id);
    ctx.success({ uid: ctx.user.id, role: ctx.user.role, registeredUser });
});

router.post('/exchange', async (ctx: Context) => {
    const { exchange } = ctx.request.body as { exchange?: string };
    if (!exchange || typeof exchange !== 'string' || exchange.length !== 32) {
        ctx.fail(400, 'Invalid exchange code');
        return;
    }

    const data = await AuthService.consumeExchangeToken(exchange);
    if (!data) {
        ctx.fail(404, 'Exchange code expired or already used');
        return;
    }

    ctx.success({ token: data.token, uid: data.uid, role: data.role });
});

export default router;
