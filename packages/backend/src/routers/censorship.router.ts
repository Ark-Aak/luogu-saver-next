import Router from 'koa-router';
import { Context, DefaultState } from 'koa';

const router = new Router<DefaultState, Context>({ prefix: '/censorship' });

import { CensorshipService } from '@/services/censorship.service';
import { CensorTarget } from '@/shared/task';

router.get('/query/:type/:id', async (ctx: Context) => {
    const { type, id } = ctx.params;
    if (!Object.values(CensorTarget).includes(type)) {
        ctx.status = 400;
        ctx.body = { error: 'Invalid type' };
        return;
    }
    const censorships = await CensorshipService.getCensorshipsByTypeAndId(type, id);
    if (!censorships) {
        ctx.fail(404, 'Censorship not found');
        return;
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    ctx.success((({ id, targetId, type, reason, ...others }) => others)(censorships[0]));
});

export default router;
