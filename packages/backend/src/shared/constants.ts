import { TaskType } from './task';

export const QUEUE_NAMES = {
    [TaskType.SAVE]: 'queue-save',
    [TaskType.LLM]: 'queue-ai',
    [TaskType.UPDATE]: 'queue-update'
};
