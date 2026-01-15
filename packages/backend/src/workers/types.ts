import { CommonTask } from '@/shared/task';

export interface TaskHandler<T extends CommonTask> {
    handle(task: T): Promise<void>;
    taskType: string;
}
