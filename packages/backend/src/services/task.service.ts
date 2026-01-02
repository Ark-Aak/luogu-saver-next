import { Task } from '@/entities/task';
import { TaskStatus, TaskType, SaveTarget, CommonTask } from '@/shared/task';
import { logger } from '@/lib/logger';
import { getQueueByType } from '@/lib/queue-factory';
import { getRandomString } from '@/utils/string';

export class TaskService {
    static async createTask(type: TaskType, payload: any, target?: string): Promise<Task> {
        const task = new Task();

        task.id = getRandomString(8);
        task.type = type;
        task.payload = payload;
        task.target = target || payload.target || '';
        task.status = TaskStatus.PENDING;
        await task.save();
        return task;
    }

    static async dispatchTask(taskId: string) {
        const task = await Task.findOne({ where: { id: taskId } });
        if (!task) throw new Error(`Task with ID ${taskId} not found.`);
        if (task.target) {
            task.payload.target = task.target;
        }
        if (task.type === TaskType.SAVE) {
            const queueSave = getQueueByType(TaskType.SAVE);

            await queueSave.add(
                TaskType.SAVE,
                {
                    id: task.id,
                    type: TaskType.SAVE,
                    payload: task.payload
                },
                { jobId: task.id }
            );
        }

        if (task.type === TaskType.AI_PROCESS) {
            const queueAi = getQueueByType(TaskType.AI_PROCESS);
            await queueAi.add(
                TaskType.AI_PROCESS,
                {
                    id: task.id,
                    type: TaskType.AI_PROCESS,
                    payload: task.payload
                },
                { jobId: task.id }
            );
        }
    }

    static async updateTask(taskId: string, status: TaskStatus, info?: string) {
        const updateData: Partial<Task> = { status };
        if (info !== undefined) {
            updateData.info = info;
        }

        await Task.update(taskId, updateData);
    }

    static async getTaskById(taskId: string): Promise<Task | null> {
        return await Task.findOne({ where: { id: taskId } });
    }
}
