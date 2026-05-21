import { apiFetch } from '@/utils/request.ts';
import type { ApiResponse } from '@/types/common';

export interface AdminUser {
    id: number;
    luoguUid: number;
    name: string;
    avatarUrl: string | null;
    createdAt: string;
    updatedAt: string;
    role: number | null;
}

interface CreateWorkflowTemplateResponse {
    workflowId: string;
    rootJobId: string;
    taskIds: Record<string, string>;
    reportTaskIds: Record<string, string>;
}

export async function getAdminUsers() {
    return (await apiFetch('/admin/users')) as ApiResponse<AdminUser[]>;
}

export async function updateAdminUserRole(uid: number, role: number) {
    return (await apiFetch(`/admin/users/${uid}/role`, {
        method: 'PATCH',
        data: { role }
    })) as ApiResponse<{ uid: number; role: number }>;
}

export async function reindexSearch(batchSize: number = 100) {
    return (await apiFetch('/admin/search/reindex', {
        method: 'POST',
        data: { batchSize }
    })) as ApiResponse<CreateWorkflowTemplateResponse>;
}

export async function rebuildArticleSummaries(batchSize: number = 20) {
    return (await apiFetch('/admin/articles/summary/rebuild', {
        method: 'POST',
        data: { batchSize }
    })) as ApiResponse<CreateWorkflowTemplateResponse>;
}
