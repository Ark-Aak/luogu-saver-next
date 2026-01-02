import { Context, Next } from 'koa';
import { Token } from '@/entities/token';

export const authorization = async (ctx: Context, next: Next) => {
    if (ctx.headers['authorization']) {
        const token = ctx.headers['authorization'].replace('Bearer ', '') as string;
        const uid = await Token.validate(token);
        if (uid) ctx.userId = uid;
    }
    await next();
};
