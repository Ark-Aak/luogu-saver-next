import { Context, Next } from 'koa';
import { Token } from '@/entities/token';

export const authorization = async (ctx: Context, next: Next) => {
    if (ctx.headers['authorization']) {
        const token = ctx.headers['authorization'].replace('Bearer ', '') as string;
        const data = await Token.validate(token);
        if (data && data.length) {
            ctx.user.id = data[0];
            ctx.user.role = data[1];
        }
    }
    await next();
};
