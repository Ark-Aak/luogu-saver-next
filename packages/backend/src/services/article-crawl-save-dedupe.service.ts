import { randomUUID } from 'node:crypto';
import { redisClient } from '@/lib/redis';

const CRAWL_SAVE_DEDUPE_TTL_SECONDS = 6 * 60 * 60;

export class ArticleCrawlSaveRecentlyQueuedError extends Error {
    constructor(articleId: string) {
        super(`Article crawl save recently queued: ${articleId}`);
    }
}

export class ArticleCrawlSaveDedupeService {
    private static key(articleId: string) {
        return `article:crawl-save:dedupe:${articleId}`;
    }

    static async acquire(articleId: string) {
        const token = randomUUID();
        const result = await redisClient.set(
            this.key(articleId),
            token,
            'EX',
            CRAWL_SAVE_DEDUPE_TTL_SECONDS,
            'NX'
        );
        if (result !== 'OK') return null;
        return token;
    }

    static async clear(articleId: string, token?: string | null) {
        if (!token) return false;
        const key = this.key(articleId);
        const script =
            'if redis.call("GET", KEYS[1]) == ARGV[1] then return redis.call("DEL", KEYS[1]) else return 0 end';
        const deleted = (await redisClient.eval(script, 1, key, token)) as number;
        return deleted === 1;
    }
}
