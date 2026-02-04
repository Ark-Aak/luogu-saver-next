import { type CommonTask } from '@/shared/task';
import { type TaskHandler } from '@/workers/types';
import { Job, UnrecoverableError } from 'bullmq';

export class TaskProcessor<T extends CommonTask> {
    private taskHandlers = new Map<string, TaskHandler<T>>();

    registerHandler(handler: TaskHandler<T>) {
        this.taskHandlers.set(handler.taskType, handler);
    }

    process = async (job: Job<T>) => {
        const task = job.data as any;
        await job.updateProgress('Fetching handler');
        const typeName = task.payload.target ? `${task.type}:${task.payload.target}` : task.type;
        const handler = this.taskHandlers.get(typeName);
        if (!handler) {
            throw new UnrecoverableError(`No handler registered for task type: ${typeName}`);
        }

        const originalGetChildrenValues = job.getChildrenValues.bind(job);
        const rawValues = await originalGetChildrenValues();
        const allAncestors: Record<string, any> = {};
        for (const value of Object.values(rawValues)) {
            if (value && typeof value === 'object' && '__result' in value) {
                if (value.__name) {
                    allAncestors[value.__name] = value.__result;
                }
                if (value.__ancestors) {
                    Object.assign(allAncestors, value.__ancestors);
                }
            }
        }
        job.getChildrenValues = async () => {
            const declaredFathers = task.__fathers;
            if (Array.isArray(declaredFathers)) {
                const filtered: Record<string, any> = {};
                for (const name of declaredFathers) {
                    if (name in allAncestors) {
                        filtered[name] = allAncestors[name];
                    }
                }
                return filtered;
            }
            return allAncestors;
        };

        await job.updateProgress('Sending to handler');
        const result = await handler.handle(task, job);

        const nextAncestors = { ...allAncestors };
        if (job.name) {
            nextAncestors[job.name] = result;
        }

        return {
            __result: result,
            __name: job.name,
            __ancestors: nextAncestors
        };
    };
}
