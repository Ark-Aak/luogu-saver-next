import { Context, Next } from 'koa';
import { Token } from '@/entities/token';

export const authorization = async (ctx: Context, next: Next) => {
    if (ctx.headers['bearer']) {
        const token = ctx.headers['bearer'];
        const uid = await Token.validate(token);
        if (uid) ctx.userId = uid;
    }
    await next();
}
