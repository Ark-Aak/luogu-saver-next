import { redisClient } from '@/lib/redis';
import { logger } from '@/lib/logger';

export function CacheEvict(keyGenerator: (...args: any[]) => string | string[]): MethodDecorator {
    return function (target: Object, propertyKey: string | symbol, descriptor: PropertyDescriptor) {
        const originalMethod = descriptor.value;
        descriptor.value = async function (...args: any[]) {
            const result = await originalMethod.apply(this, args);
            try {
                const rawKeys = keyGenerator(...args);
                const keysToDelete = Array.isArray(rawKeys) ? rawKeys : [rawKeys];
                if (keysToDelete.length > 0) {
                    await redisClient.del(...keysToDelete);
                    logger.info({ keys: keysToDelete }, 'Cache evicted successfully');
                }
            } catch (err) {
                logger.error({ err }, 'Error evicting Redis cache');
            }
            return result;
        };
        return descriptor;
    };
}
