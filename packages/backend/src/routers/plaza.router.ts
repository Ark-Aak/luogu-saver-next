import Router from 'koa-router';
import { Context, DefaultState } from 'koa';
import { Article } from '@/entities/article';

const router = new Router<DefaultState, Context>({ prefix: '/plaza' });

import { RecommendationService } from '@/services/recommendation.service';

const MAX_EXCLUDED_ARTICLES = 200;

function parseExcludedArticles(exclude: unknown): string[] {
    const rawExclude = Array.isArray(exclude) ? exclude.join(',') : exclude;
    if (typeof rawExclude !== 'string') return [];

    const seen = new Set<string>();
    const excludedArticles: string[] = [];

    for (const articleId of rawExclude.split(',')) {
        const trimmedId = articleId.trim();
        if (!trimmedId || seen.has(trimmedId)) continue;

        seen.add(trimmedId);
        excludedArticles.push(trimmedId);
        if (excludedArticles.length >= MAX_EXCLUDED_ARTICLES) break;
    }

    return excludedArticles;
}

router.get('/get', async (ctx: Context) => {
    const count = parseInt(ctx.query.count as string) || 10;
    const excludedArticles = parseExcludedArticles(ctx.query.exclude);
    let recommendations: Partial<Article & { reason: string }>[] = [];
    if (ctx.userId) {
        // logged in user
        ctx.fail(501, 'Not implemented yet');
    } else {
        const deviceId = ctx.headers['x-device-id'] as string;
        const hasTrackingConsent = ctx.headers['x-consent-tracking'] === 'true';
        if (hasTrackingConsent && deviceId) {
            recommendations = await RecommendationService.getAnonymousRecommendations(
                deviceId,
                count,
                excludedArticles
            );
        } else {
            recommendations = await RecommendationService.getPublicRecommendations(
                count,
                excludedArticles
            );
        }
    }
    ctx.success(recommendations);
});

export default router;
