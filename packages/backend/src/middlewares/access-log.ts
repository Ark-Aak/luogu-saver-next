import { Context, Next } from 'koa';
import { logger } from '@/lib/logger';

export const accessLog = async (ctx: Context, next: Next) => {
    try {
        await next();
    } finally {
        logger.info(
            {
                ip: ctx.ip,
                userId: ctx.user?.id ?? null,
                method: ctx.method,
                path: ctx.path,
                status: ctx.status
            },
            'HTTP access'
        );
    }
};
