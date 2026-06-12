import { Context } from 'koa';

export function getClientIp(ctx: Context): string {
    return ctx.ip;
}
