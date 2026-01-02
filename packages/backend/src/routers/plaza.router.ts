import Router from 'koa-router';
import { Context, DefaultState } from 'koa';
import { Article } from '@/entities/article';

const router = new Router<DefaultState, Context>({ prefix: '/plaza' });

import { RecommendationService } from '@/services/recommendation.service';

router.get('/get', async (ctx: Context) => {
    const count = parseInt(ctx.query.count as string) || 10;
    let recommendations: Partial<Article & { reason: string }>[] = [];
    if (ctx.userId) {
        // logged in user
        ctx.fail(501, 'Not implemented yet');
    } else {
        const deviceId = ctx.headers['x-device-id'] as string;
        if (deviceId) {
            recommendations = await RecommendationService.getAnonymousRecommendations(deviceId, count);
        }
    }
    ctx.success(recommendations);
});

export default router;
