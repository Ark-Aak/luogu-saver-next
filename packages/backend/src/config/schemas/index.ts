import { z } from 'zod';
import { ServerSchema } from './server';
import { DbSchema, RedisSchema, ChromaSchema } from './infrastructure';
import { RecommendationSchema, QueueSchema } from './business';
import { LLMConfigSchema } from './llm';
import { VerificationSchema } from './verification';

export const AppConfigSchema = ServerSchema.extend({
    db: DbSchema,
    redis: RedisSchema,
    chroma: ChromaSchema,
    recommendation: RecommendationSchema,
    queue: QueueSchema,
    llm: LLMConfigSchema,
    verification: VerificationSchema
});

export type AppConfig = z.infer<typeof AppConfigSchema>;
