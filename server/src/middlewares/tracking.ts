import { Context, Next } from 'koa';
import { TrackingEvents } from "@/constants/tracking-events";
import { RecommendationService } from "@/services/recommendation.service";
import { logger } from "@/utils/logger";

export const trackingMiddleware = async (ctx: Context, next: Next) => {
    if (ctx.headers['x-consent-tracking'] === 'true') {
        if (ctx.userId) {
            // user has logged in so do not use device id
        }
        else {
            ctx.track = async (event: string, data: string) => {
                if (event === TrackingEvents.VIEW_ARTICLE) {
                    const deviceId = ctx.headers['x-device-id'] as string;
                    const articleId = data;
                    logger.debug(`Tracking anonymous VIEW_ARTICLE: deviceId=${deviceId}, articleId=${articleId}`);
                    if (deviceId && articleId) {
                        await RecommendationService.recordAnonymousBehavior(deviceId, articleId);
                    }
                }
            }
        }
    }
    await next();
}