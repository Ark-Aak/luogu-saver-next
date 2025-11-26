import Router from 'koa-router';
import { Context, DefaultState } from 'koa';

const router = new Router<DefaultState, Context>({ prefix: '/paste' });

import { PasteService } from '@/services/paste.service';

router.get('/query/:id', async (ctx: Context) => {
    const pasteId = ctx.params.id;
    const paste = await PasteService.getPasteById(pasteId);
    await paste?.loadRelationships();
    if (paste) {
        if (paste.deleted) {
            ctx.fail(403, paste.deletedReason);
        }
        else {
            ctx.success(paste);
        }
    }
    else {
        ctx.fail(404, 'Paste not found');
    }
});

router.get('/count', async (ctx: Context) => {
    const count = await PasteService.getPasteCount();
    ctx.success({ count });
});

export default router;