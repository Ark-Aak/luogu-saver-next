import { z } from 'zod';

export const RecommendationSchema = z.object({
    anonymous: z.object({
        expireTime: z.number().default(7 * 24 * 60 * 60),
        maxCount: z.number().default(100)
    }),
    maxHistory: z.number().default(500),
    decayFactor: z.number().default(0.9),
    relevantThreshold: z.number().default(0.75)
});

export const QueueSchema = z.object({
    save: z.object({
        concurrencyLimit: z.number().default(2),
        maxRequestToken: z.number().default(20),
        regenerationInterval: z.number().default(1000),
        maxQueueLength: z.number().default(1000)
    }),
    ai: z.object({
        concurrencyLimit: z.number().default(10),
        maxRequestToken: z.number().default(50),
        regenerationInterval: z.number().default(1000),
        maxQueueLength: z.number().default(2000)
    }),
    update: z.object({
        concurrencyLimit: z.number().default(2),
        maxRequestToken: z.number().default(20),
        regenerationInterval: z.number().default(1000),
        maxQueueLength: z.number().default(1000)
    })
});
