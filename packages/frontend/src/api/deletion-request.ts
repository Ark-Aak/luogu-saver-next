import { apiFetch } from '@/utils/request.ts';
import type { ApiResponse } from '@/types/common';

export type DeletionRequestTargetType = 'article' | 'paste';

export type DeletionRequestStatus = 'pending' | 'approved' | 'rejected';

export interface DeletionRequestItem {
    id: number;
    targetType: DeletionRequestTargetType;
    targetId: string;
    reason: string;
    status: DeletionRequestStatus;
    resolutionComment: string | null;
    createdAt: string;
    handledAt: string | null;
}

export interface AdminDeletionRequestItem extends DeletionRequestItem {
    requester: { id: number; name: string; luoguUid: number; avatarUrl: string | null } | null;
    handler: { id: number; name: string } | null;
    target: { exists: boolean; deleted: boolean; title: string | null };
    requesterIsAuthor: boolean;
}

export interface DeletionRequestListResponse {
    requests: DeletionRequestItem[];
    total: number;
    page: number;
    pageSize: number;
}

export interface AdminDeletionRequestListResponse {
    requests: AdminDeletionRequestItem[];
    total: number;
    page: number;
    pageSize: number;
}

export async function createDeletionRequest(
    targetType: DeletionRequestTargetType,
    targetId: string,
    reason: string
) {
    return (await apiFetch('/deletion-request', {
        method: 'POST',
        data: { targetType, targetId, reason }
    })) as ApiResponse<DeletionRequestItem>;
}

export async function getMyDeletionRequests(page = 1, pageSize = 20) {
    return (await apiFetch('/deletion-request/mine', {
        params: { page, pageSize }
    })) as ApiResponse<DeletionRequestListResponse>;
}

export async function getAdminDeletionRequests(
    status: DeletionRequestStatus | 'all' = 'pending',
    page = 1,
    pageSize = 20
) {
    return (await apiFetch('/admin/deletion-requests', {
        params: { status, page, pageSize }
    })) as ApiResponse<AdminDeletionRequestListResponse>;
}

export async function approveDeletionRequest(id: number, comment?: string) {
    return (await apiFetch(`/admin/deletion-requests/${id}/approve`, {
        method: 'POST',
        data: { comment }
    })) as ApiResponse<AdminDeletionRequestItem>;
}

export async function rejectDeletionRequest(id: number, comment?: string) {
    return (await apiFetch(`/admin/deletion-requests/${id}/reject`, {
        method: 'POST',
        data: { comment }
    })) as ApiResponse<AdminDeletionRequestItem>;
}
