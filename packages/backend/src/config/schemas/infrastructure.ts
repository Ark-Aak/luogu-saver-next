import { z } from 'zod';

export const DbSchema = z.object({
    host: z.string().default('localhost'),
    user: z.string().default('root'),
    port: z.number().default(3306),
    password: z.string().default(''),
    database: z.string().default('mydatabase')
});

export const RedisSchema = z.object({
    host: z.string().default('localhost'),
    port: z.number().default(6379),
    password: z.string().default(''),
    keyPrefix: z.string().default('')
});

export const ChromaSchema = z.object({
    enable: z.boolean().default(false),
    ssl: z.boolean().default(false),
    host: z.string().default('127.0.0.1'),
    port: z.number().default(8000),
    collectionName: z.string().default('lgs_articles')
});

export const MeilisearchSchema = z.object({
    enable: z.boolean().default(false),
    host: z.string().default('http://127.0.0.1:7700'),
    apiKey: z.string().default(''),
    articleIndexName: z.string().default('lgs_articles')
});
