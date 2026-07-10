import { EntityManager, In, IsNull } from 'typeorm';
import { UserNotification } from '@/entities/user-notification';
import { getServiceRepository } from '@/services/helpers/repository.helper';
import { clampInt } from '@/utils/number';

type CreateNotificationInput = {
    recipientId: number;
    type: string;
    title: string;
    content?: string | null;
    metadata?: Record<string, unknown> | null;
};

type NotificationItem = {
    id: number;
    type: string;
    title: string;
    content: string | null;
    metadata: Record<string, unknown> | null;
    read: boolean;
    createdAt: Date;
};

export class UserNotificationService {
    static async createNotification(
        input: CreateNotificationInput,
        manager?: EntityManager
    ): Promise<UserNotification> {
        if (!Number.isInteger(input.recipientId) || input.recipientId <= 0) {
            throw Object.assign(new Error('Valid recipientId is required'), { status: 400 });
        }

        const type = String(input.type ?? '').trim();
        const title = String(input.title ?? '').trim();
        if (!type || !title) {
            throw Object.assign(new Error('Valid type and title are required'), { status: 400 });
        }

        const content = String(input.content ?? '').trim();
        const repository = getServiceRepository<UserNotification>(UserNotification, manager);
        const notification = repository.create({
            recipientId: input.recipientId,
            type,
            title,
            content: content || null,
            metadata: input.metadata ?? null,
            readAt: null
        });
        return await repository.save(notification);
    }

    static async listNotifications(
        userId: number,
        page?: unknown,
        pageSize?: unknown
    ): Promise<{
        notifications: NotificationItem[];
        total: number;
        unreadCount: number;
        page: number;
        pageSize: number;
    }> {
        const normalizedPage = clampInt(page, 1, 1, Number.MAX_SAFE_INTEGER);
        const normalizedPageSize = clampInt(pageSize, 20, 1, 100);

        const [rows, total] = await getServiceRepository<UserNotification>(
            UserNotification
        ).findAndCount({
            where: { recipientId: userId },
            order: { createdAt: 'DESC', id: 'DESC' },
            skip: (normalizedPage - 1) * normalizedPageSize,
            take: normalizedPageSize
        });
        const unreadCount = await this.getUnreadCount(userId);

        return {
            notifications: rows.map(row => this.toItem(row)),
            total,
            unreadCount,
            page: normalizedPage,
            pageSize: normalizedPageSize
        };
    }

    static async getUnreadCount(userId: number): Promise<number> {
        return await getServiceRepository<UserNotification>(UserNotification).count({
            where: { recipientId: userId, readAt: IsNull() }
        });
    }

    static async markRead(userId: number, ids: unknown): Promise<{ updated: number }> {
        const isValidIdArray =
            Array.isArray(ids) &&
            ids.length >= 1 &&
            ids.length <= 100 &&
            ids.every(id => Number.isInteger(id) && id > 0);
        if (!isValidIdArray) {
            throw Object.assign(new Error('Valid ids array is required'), { status: 400 });
        }

        const result = await getServiceRepository<UserNotification>(UserNotification).update(
            { id: In(ids as number[]), recipientId: userId, readAt: IsNull() },
            { readAt: new Date() }
        );
        return { updated: result.affected ?? 0 };
    }

    static async markAllRead(userId: number): Promise<{ updated: number }> {
        const result = await getServiceRepository<UserNotification>(UserNotification).update(
            { recipientId: userId, readAt: IsNull() },
            { readAt: new Date() }
        );
        return { updated: result.affected ?? 0 };
    }

    private static toItem(row: UserNotification): NotificationItem {
        return {
            id: row.id,
            type: row.type,
            title: row.title,
            content: row.content ?? null,
            metadata: row.metadata ?? null,
            read: row.readAt !== null,
            createdAt: row.createdAt
        };
    }
}
