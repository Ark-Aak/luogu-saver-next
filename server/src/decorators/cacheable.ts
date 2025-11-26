import { redisClient } from '@/config/redis';
import { plainToInstance } from "class-transformer";

export type ClassConstructor<T> = { new(...args: any[]): T };

export function Cacheable(
    ttlSeconds: number = 60,
    keyGenerator: (...args: any[]) => string,
    EntityClass?: ClassConstructor<any>
): MethodDecorator {
    return function (
        target: Object,
        propertyKey: string | symbol,
        descriptor: PropertyDescriptor
    ) {
        const originalMethod = descriptor.value;
        descriptor.value = async function (...args: any[]) {
            const cacheKey = keyGenerator(...args);
            try {
                const cachedResult = await redisClient.get(cacheKey);
                if (cachedResult) {
                    const parsedResult = JSON.parse(cachedResult);
                    if (EntityClass) {
                        return plainToInstance(EntityClass, parsedResult);
                    }
                    return parsedResult;
                }
            } catch (err) {
                console.error(err);
            }
            const result = await originalMethod.apply(this, args);
            if (result) {
                redisClient.set(cacheKey, JSON.stringify(result), 'EX', ttlSeconds).catch(console.error);
            }
            return result;
        }
        return descriptor;
    };
}
