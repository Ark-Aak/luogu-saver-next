import { apiFetch } from '@/utils/request.ts';
import type { ApiResponse } from '@/types/common';
import type { Announcement } from '@/api/announcement.ts';

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

export async function rebuildArticleSummaries(batchSize: number = 20, concurrency: number = 5) {
    return (await apiFetch('/admin/articles/summary/rebuild', {
        method: 'POST',
        data: { batchSize, concurrency }
    })) as ApiResponse<CreateWorkflowTemplateResponse>;
}

export async function rebuildArticleEmbeddings(batchSize: number = 20, concurrency: number = 5) {
    return (await apiFetch('/admin/articles/embedding/rebuild', {
        method: 'POST',
        data: { batchSize, concurrency }
    })) as ApiResponse<CreateWorkflowTemplateResponse>;
}

export async function getAdminAnnouncement() {
    return (await apiFetch('/admin/announcement')) as ApiResponse<Announcement>;
}

export async function updateAdminAnnouncement(data: {
    title: string;
    content: string;
    enabled: boolean;
}) {
    return (await apiFetch('/admin/announcement', {
        method: 'PUT',
        data
    })) as ApiResponse<Announcement>;
}
