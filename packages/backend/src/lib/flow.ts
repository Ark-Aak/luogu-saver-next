import { FlowProducer } from 'bullmq';
import { config } from '@/config';

let flowProducer: FlowProducer | null = null;

export function getFlowProducer(): FlowProducer {
    if (!flowProducer) {
        flowProducer = new FlowProducer({
            connection: {
                host: config.redis.host,
                port: config.redis.port,
                password: config.redis.password,
                keyPrefix: config.redis.keyPrefix
            }
        });
    }
    return flowProducer;
}
