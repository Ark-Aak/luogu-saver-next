import { TypedQueue } from './queue-wrapper';
import { TaskType, TaskDefinition } from '@/shared/task';
import { QUEUE_NAMES } from '@/shared/constants';
import { logger } from '@/lib/logger';

const queuePool = new Map<string, TypedQueue<any>>();

function getOrCreateQueue<T>(queueName: string): TypedQueue<T> {
    if (!queuePool.has(queueName)) {
        queuePool.set(queueName, new TypedQueue<T>(queueName));
    }

    return queuePool.get(queueName) as TypedQueue<T>;
}

export function getQueueByType<T extends TaskType>(type: T): TypedQueue<TaskDefinition[T]> {
    const queueName = QUEUE_NAMES[type];

    if (!queueName) {
        throw new Error(`No queue name defined for task type: ${type}`);
    }

    return getOrCreateQueue<TaskDefinition[T]>(queueName);
}

export function getQueueByName(queueName: string): TypedQueue<any> {
    return getOrCreateQueue<any>(queueName);
}

export async function closeAllQueues() {
    logger.info(`Closing ${queuePool.size} active queues...`);
    const closePromises = [];
    for (const wrapper of queuePool.values()) {
        closePromises.push(wrapper.close());
    }
    await Promise.all(closePromises);
    queuePool.clear();
}
