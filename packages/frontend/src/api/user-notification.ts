import { apiFetch } from '@/utils/request.ts';
import type { ApiResponse } from '@/types/common';

export interface UserNotificationItem {
    id: number;
    type: string;
    title: string;
    content: string | null;
    metadata: Record<string, unknown> | null;
    read: boolean;
    createdAt: string;
}

export interface UserNotificationListResponse {
    notifications: UserNotificationItem[];
    total: number;
    unreadCount: number;
    page: number;
    pageSize: number;
}

export async function getUserNotifications(page = 1, pageSize = 20) {
    return (await apiFetch('/user-notification/list', {
        params: { page, pageSize }
    })) as ApiResponse<UserNotificationListResponse>;
}

export async function getUnreadNotificationCount() {
    return (await apiFetch('/user-notification/unread-count')) as ApiResponse<{ count: number }>;
}

export async function markUserNotificationsRead(ids: number[]) {
    return (await apiFetch('/user-notification/read', {
        method: 'POST',
        data: { ids }
    })) as ApiResponse<{ updated: number }>;
}

export async function markAllUserNotificationsRead() {
    return (await apiFetch('/user-notification/read-all', {
        method: 'POST'
    })) as ApiResponse<{ updated: number }>;
}
