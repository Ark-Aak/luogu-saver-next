import { Context, Next } from 'koa';

function nomalizeError(err: unknown): Error & { status?: number } {
    if (err instanceof Error) {
        return err;
    }
    return new Error(String(err));
}

export const responseHelper = async (ctx: Context, next: Next) => {
    ctx.success = (data: any = null, msg: string = 'Success') => {
        ctx.status = 200;
        ctx.body = {
            code: 200,
            message: msg,
            data: data
        };
    };
    ctx.fail = (code: number, msg: string, data: any = null) => {
        ctx.status = 200;
        ctx.body = {
            code: code,
            message: msg,
            data: data
        };
    };
    try {
        await next();
        if (ctx.status === 404 && !ctx.body) {
            ctx.fail(404, 'Not Found');
        }
    } catch (err) {
        const error = nomalizeError(err);
        const status = error.status || 500;
        ctx.fail(status, error.message || 'Internal Server Error');
        if (status >= 500) ctx.app.emit('error', err, ctx);
    }
};
