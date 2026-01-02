import { apiFetch } from '@/utils/request.ts';
import type { ApiResponse } from '@/types/common';
import { type Task, TaskType } from '@/types/task';

export async function getTaskById(id: string) {
    return (await apiFetch(`/task/query/${id}`)) as ApiResponse<Task>;
}

export async function createTask(type: TaskType, payload: any, target: string) {
    return (await apiFetch('/task/create', {
        method: 'POST',
        data: { type, payload, target }
    })) as ApiResponse<{ taskId: string }>;
}
