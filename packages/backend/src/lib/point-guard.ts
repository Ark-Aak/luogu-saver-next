import { Redis } from 'ioredis';
import { redisClient } from './redis';

export class PointGuard {
    private redis: Redis;
    private readonly key: string;
    private readonly capacity: number;
    private readonly rate: number;

    /*
     * @param key Identifier for the point guard instance
     * @param capacity Maximum points in the bucket (default: 100)
     * @param rate Points regenerated per second (default: 1)
     */
    constructor(key: string, capacity: number, rate: number) {
        this.redis = redisClient;
        this.key = `point_guard:${key}`;
        this.capacity = capacity;
        this.rate = rate;
    }

    /*
     * Attempt to consume points from the bucket.
     * @param cost Number of points to consume (default: 1)
     * @return `true` if points were successfully consumed, `false` otherwise
     */
    async consume(cost: number = 1): Promise<boolean> {
        const script = `
      local key = KEYS[1]
      local capacity = tonumber(ARGV[1])
      local rate = tonumber(ARGV[2])
      local cost = tonumber(ARGV[3])
      local now = tonumber(ARGV[4])

      local data = redis.call("HMGET", key, "tokens", "last_updated")
      local tokens = tonumber(data[1])
      local last_updated = tonumber(data[2])

      if tokens == nil then
        tokens = capacity
        last_updated = now
      end

      local delta = math.max(0, now - last_updated)
      local refill = (delta / 1000) * rate
      
      tokens = math.min(capacity, tokens + refill)

      if tokens >= cost then
        tokens = tokens - cost
        redis.call("HMSET", key, "tokens", tokens, "last_updated", now)
        return 1
      else
        return 0
      end
    `;

        const result = await this.redis.eval(script, 1, this.key, this.capacity, this.rate, cost, Date.now());

        return result === 1;
    }
}
