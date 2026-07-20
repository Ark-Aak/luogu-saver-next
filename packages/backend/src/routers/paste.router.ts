import Router from 'koa-router';
import { Context, DefaultState } from 'koa';

const router = new Router<DefaultState, Context>({ prefix: '/paste' });

import { PasteService } from '@/services/paste.service';

router.get('/query/:id', async (ctx: Context) => {
    const pasteId = ctx.params.id;
    try {
        const paste = await PasteService.getPasteById(pasteId);
        if (!paste) {
            ctx.fail(404, 'Paste not found');
            return;
        }
        await paste.renderContent();
        if (paste.deleted) {
            ctx.fail(403, paste.deleteReason);
        } else {
            ctx.success(paste);
        }
    } catch {
        ctx.fail(500, 'Failed to retrieve paste');
    }
});

router.get('/count', async (ctx: Context) => {
    try {
        const count = await PasteService.getPasteCount();
        ctx.success({ count });
    } catch {
        ctx.fail(500, 'Failed to retrieve paste count');
    }
});

export default router;
