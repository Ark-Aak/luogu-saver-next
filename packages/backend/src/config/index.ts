import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

interface Config {
    port: number;
    env: string;
    db: {
        host: string;
        user: string;
        port: number;
        password: string;
        database: string;
    };
    redis: {
        host: string;
        port: number;
        password: string;
        keyPrefix: string;
    };
    chroma: {
        ssl: boolean;
        host: string;
        port: number;
        collectionName: string;
    };
    recommendation: {
        anonymous: {
            exprireTime: number;
            maxCount: number;
        };
        maxHistory: number;
        decayFactor: number;
        relevantThreshold: number;
    };
    queue: {
        concurrencyLimit: number;
        maxRequestToken: number;
        regenerationSpeed: number;
        regenerationInterval: number;
        maxQueueLength: number;
        processInterval: number;
    };
    network: {
        timeout: number;
    };
}

export const config: Config = {
    port: process.env.PORT ? parseInt(process.env.PORT, 10) : 3000,
    env: process.env.NODE_ENV || 'development',
    db: {
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        port: process.env.DB_PORT ? parseInt(process.env.DB_PORT, 10) : 3306,
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'mydatabase'
    },
    redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: process.env.REDIS_PORT ? parseInt(process.env.REDIS_PORT, 10) : 6379,
        password: process.env.REDIS_PASSWORD || '',
        keyPrefix: process.env.REDIS_KEY_PREFIX || ''
    },
    chroma: {
        ssl: process.env.CHROMA_SSL === 'true',
        host: process.env.CHROMA_HOST || '127.0.0.1',
        port: process.env.CHROMA_PORT ? parseInt(process.env.CHROMA_PORT, 10) : 8000,
        collectionName: process.env.CHROMA_COLLECTION_NAME || 'lgs_articles'
    },
    recommendation: {
        anonymous: {
            exprireTime: process.env.RECOMMENDATION_ANONYMOUS_EXPIRE_TIME
                ? parseInt(process.env.RECOMMENDATION_ANONYMOUS_EXPIRE_TIME, 10)
                : 7 * 24 * 60 * 60,
            maxCount: process.env.RECOMMENDATION_ANONYMOUS_MAX_COUNT
                ? parseInt(process.env.RECOMMENDATION_ANONYMOUS_MAX_COUNT, 100)
                : 100
        },
        maxHistory: process.env.RECOMMENDATION_MAX_HISTORY ? parseInt(process.env.RECOMMENDATION_MAX_HISTORY, 10) : 500,
        decayFactor: process.env.RECOMMENDATION_DECAY_FACTOR
            ? parseFloat(process.env.RECOMMENDATION_DECAY_FACTOR)
            : 0.9,
        relevantThreshold: process.env.RECOMMENDATION_RELEVANT_THRESHOLD
            ? parseFloat(process.env.RECOMMENDATION_RELEVANT_THRESHOLD)
            : 0.75
    },
    queue: {
        concurrencyLimit: process.env.QUEUE_CONCURRENCY_LIMIT ? parseInt(process.env.QUEUE_CONCURRENCY_LIMIT, 10) : 5,
        maxRequestToken: process.env.QUEUE_MAX_REQUEST_TOKEN ? parseInt(process.env.QUEUE_MAX_REQUEST_TOKEN, 10) : 20,
        regenerationSpeed: process.env.QUEUE_REGENERATION_SPEED ? parseFloat(process.env.QUEUE_REGENERATION_SPEED) : 1,
        regenerationInterval: process.env.QUEUE_REGENERATION_INTERVAL
            ? parseInt(process.env.QUEUE_REGENERATION_INTERVAL, 10)
            : 1000,
        maxQueueLength: process.env.QUEUE_MAX_QUEUE_LENGTH ? parseInt(process.env.QUEUE_MAX_QUEUE_LENGTH, 10) : 1000,
        processInterval: process.env.QUEUE_PROCESS_INTERVAL ? parseInt(process.env.QUEUE_PROCESS_INTERVAL, 10) : 100
    },
    network: {
        timeout: process.env.NETWORK_TIMEOUT ? parseInt(process.env.NETWORK_TIMEOUT, 10) : 30000
    }
};
