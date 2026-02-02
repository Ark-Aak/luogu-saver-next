import { type CommonTask } from '@/shared/task';
import { type TaskHandler } from '@/workers/types';
import { Job, UnrecoverableError } from 'bullmq';

export class TaskProcessor<T extends CommonTask> {
    private taskHandlers = new Map<string, TaskHandler<T>>();

    registerHandler(handler: TaskHandler<T>) {
        this.taskHandlers.set(handler.taskType, handler);
    }

    process = async (job: Job<T>) => {
        const task = job.data;
        await job.updateProgress('Fetching handler');
        const typeName = task.payload.target ? `${task.type}:${task.payload.target}` : task.type;
        const handler = this.taskHandlers.get(typeName);
        if (!handler) {
            throw new UnrecoverableError(`No handler registered for task type: ${typeName}`);
        }
        await job.updateProgress('Sending to handler');
        return await handler.handle(task, job);
    };
}
