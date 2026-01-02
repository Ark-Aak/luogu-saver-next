import { TypedQueue } from './queue-wrapper';
import { TaskType, TaskDefinition } from '@/shared/task';
import { QUEUE_NAMES } from '@/shared/constants';
import { logger } from '@/lib/logger';

const queuePool = new Map<string, TypedQueue<any>>();

export function getQueueByType<T extends TaskType>(type: T): TypedQueue<TaskDefinition[T]> {
    const queueName = QUEUE_NAMES[type];

    if (!queueName) {
        throw new Error(`No queue name defined for task type: ${type}`);
    }

    if (!queuePool.has(queueName)) {
        const queue = new TypedQueue<TaskDefinition[T]>(queueName);
        queuePool.set(queueName, queue);
    }

    return queuePool.get(queueName) as TypedQueue<TaskDefinition[T]>;
}

export async function closeAllQueues() {
    logger.info(`Closing ${queuePool.size} active queues...`);
    const closePromises = [];
    for (const [name, wrapper] of queuePool.entries()) {
        closePromises.push(wrapper.close());
    }
    await Promise.all(closePromises);
    queuePool.clear();
}
