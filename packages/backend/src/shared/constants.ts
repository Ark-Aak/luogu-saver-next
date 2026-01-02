import { TaskType } from './task';

export const QUEUE_NAMES = {
    [TaskType.SAVE]: 'queue-save',
    [TaskType.AI_PROCESS]: 'queue-ai'
};
