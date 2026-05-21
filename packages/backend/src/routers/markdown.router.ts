import Router from 'koa-router';
import { Context, DefaultState } from 'koa';
import renderMarkdown from '@/lib/markdown';

const router = new Router<DefaultState, Context>({ prefix: '/markdown' });

router.post('/render', async (ctx: Context) => {
    const { content } = ctx.request.body as { content?: string };
    ctx.success({ html: await renderMarkdown(content || '') });
});

export default router;
