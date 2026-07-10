import { In } from 'typeorm';
import {
    DeletionRequest,
    type DeletionRequestStatus,
    type DeletionRequestTargetType
} from '@/entities/deletion-request';
import { Article } from '@/entities/article';
import { Paste } from '@/entities/paste';
import { RegisteredUser } from '@/entities/registered-user';
import { ArticleService } from '@/services/article.service';
import { PasteService } from '@/services/paste.service';
import { UserNotificationService } from '@/services/user-notification.service';
import {
    findOneServiceEntity,
    findServiceEntities,
    getServiceRepository
} from '@/services/helpers/repository.helper';
import { clampInt } from '@/utils/number';

const TARGET_DELETE_REASON = '应用户申请删除';

type CreateRequestInput = {
    targetType?: unknown;
    targetId?: unknown;
    reason?: unknown;
};

type DeletionRequestItem = {
    id: number;
    targetType: DeletionRequestTargetType;
    targetId: string;
    reason: string;
    status: DeletionRequestStatus;
    resolutionComment: string | null;
    createdAt: Date;
    handledAt: Date | null;
};

type AdminDeletionRequestItem = DeletionRequestItem & {
    requester: { id: number; name: string; luoguUid: number; avatarUrl: string | null } | null;
    handler: { id: number; name: string } | null;
    target: { exists: boolean; deleted: boolean; title: string | null };
    requesterIsAuthor: boolean;
};

export class DeletionRequestService {
    static async createRequest(
        requesterId: number,
        input: CreateRequestInput
    ): Promise<DeletionRequestItem> {
        const targetType = input.targetType;
        if (targetType !== 'article' && targetType !== 'paste') {
            throw Object.assign(new Error('Invalid target type'), { status: 400 });
        }

        const targetId = String(input.targetId ?? '').trim();
        if (!targetId || targetId.length > 8) {
            throw Object.assign(new Error('Valid targetId is required'), { status: 400 });
        }

        const reason = String(input.reason ?? '').trim();
        if (!reason) {
            throw Object.assign(new Error('Reason is required'), { status: 400 });
        }
        if (reason.length > 500) {
            throw Object.assign(new Error('Reason is too long (max 500 chars)'), { status: 400 });
        }

        const target = await this.findTarget(targetType, targetId);
        if (!target) {
            throw Object.assign(new Error('Target content not found'), { status: 404 });
        }
        if (target.deleted) {
            throw Object.assign(new Error('Target content already deleted'), { status: 400 });
        }

        const pendingDuplicate = await findOneServiceEntity<DeletionRequest>(DeletionRequest, {
            where: { targetType, targetId, requesterId, status: 'pending' }
        });
        if (pendingDuplicate) {
            throw Object.assign(new Error('A pending deletion request already exists'), {
                status: 409
            });
        }

        const repository = getServiceRepository<DeletionRequest>(DeletionRequest);
        const request = repository.create({
            targetType,
            targetId,
            requesterId,
            reason,
            status: 'pending' as DeletionRequestStatus,
            resolutionComment: null,
            handlerId: null,
            handledAt: null
        });
        return this.toItem(await repository.save(request));
    }

    static async listMyRequests(
        requesterId: number,
        page?: unknown,
        pageSize?: unknown
    ): Promise<{
        requests: DeletionRequestItem[];
        total: number;
        page: number;
        pageSize: number;
    }> {
        const normalizedPage = clampInt(page, 1, 1, Number.MAX_SAFE_INTEGER);
        const normalizedPageSize = clampInt(pageSize, 20, 1, 100);

        const [rows, total] = await getServiceRepository<DeletionRequest>(
            DeletionRequest
        ).findAndCount({
            where: { requesterId },
            order: { createdAt: 'DESC', id: 'DESC' },
            skip: (normalizedPage - 1) * normalizedPageSize,
            take: normalizedPageSize
        });

        return {
            requests: rows.map(row => this.toItem(row)),
            total,
            page: normalizedPage,
            pageSize: normalizedPageSize
        };
    }

    static async listAdminRequests(
        status: unknown,
        page?: unknown,
        pageSize?: unknown
    ): Promise<{
        requests: AdminDeletionRequestItem[];
        total: number;
        page: number;
        pageSize: number;
    }> {
        const statusFilter = String(status ?? 'pending');
        if (!['pending', 'approved', 'rejected', 'all'].includes(statusFilter)) {
            throw Object.assign(new Error('Invalid status filter'), { status: 400 });
        }

        const normalizedPage = clampInt(page, 1, 1, Number.MAX_SAFE_INTEGER);
        const normalizedPageSize = clampInt(pageSize, 20, 1, 100);

        const [rows, total] = await getServiceRepository<DeletionRequest>(
            DeletionRequest
        ).findAndCount({
            where: statusFilter === 'all' ? {} : { status: statusFilter as DeletionRequestStatus },
            order: { createdAt: 'DESC', id: 'DESC' },
            skip: (normalizedPage - 1) * normalizedPageSize,
            take: normalizedPageSize
        });

        return {
            requests: await this.buildAdminItems(rows),
            total,
            page: normalizedPage,
            pageSize: normalizedPageSize
        };
    }

    static async approveRequest(
        requestId: number,
        handlerId: number,
        comment?: unknown
    ): Promise<AdminDeletionRequestItem> {
        const resolutionComment = this.normalizeComment(comment);
        const request = await this.findPendingRequest(requestId);

        const target = await this.findTarget(request.targetType, request.targetId);
        if (!target) {
            throw Object.assign(new Error('Target content not found'), { status: 404 });
        }

        // The soft delete goes through the owning service (outside the transaction
        // below) so its @CacheEvict keys are dropped. If the later request update
        // fails, re-approving is safe: an already-deleted target is left untouched.
        if (!target.deleted) {
            target.deleted = true;
            target.deleteReason = TARGET_DELETE_REASON;
            if (request.targetType === 'article') {
                await ArticleService.saveArticle(target as Article);
            } else {
                await PasteService.savePaste(target as Paste);
            }
        }

        await this.finalizeRequest(request, 'approved', handlerId, resolutionComment);
        return (await this.buildAdminItems([request]))[0];
    }

    static async rejectRequest(
        requestId: number,
        handlerId: number,
        comment?: unknown
    ): Promise<AdminDeletionRequestItem> {
        const resolutionComment = this.normalizeComment(comment);
        const request = await this.findPendingRequest(requestId);

        await this.finalizeRequest(request, 'rejected', handlerId, resolutionComment);
        return (await this.buildAdminItems([request]))[0];
    }

    private static async findPendingRequest(requestId: number): Promise<DeletionRequest> {
        const request = await findOneServiceEntity<DeletionRequest>(DeletionRequest, {
            where: { id: requestId }
        });
        if (!request) {
            throw Object.assign(new Error('Deletion request not found'), { status: 404 });
        }
        if (request.status !== 'pending') {
            throw Object.assign(new Error('Deletion request already handled'), { status: 409 });
        }
        return request;
    }

    private static async finalizeRequest(
        request: DeletionRequest,
        outcome: 'approved' | 'rejected',
        handlerId: number,
        resolutionComment: string | null
    ): Promise<void> {
        await DeletionRequest.transaction(async manager => {
            request.status = outcome;
            request.handlerId = handlerId;
            request.handledAt = new Date();
            request.resolutionComment = resolutionComment;
            await getServiceRepository<DeletionRequest>(DeletionRequest, manager).save(request);

            await UserNotificationService.createNotification(
                {
                    recipientId: request.requesterId,
                    type: 'deletion_review',
                    title: outcome === 'approved' ? '删除申请已通过' : '删除申请未通过',
                    content: this.buildReviewContent(request, outcome),
                    metadata: {
                        deletionRequestId: request.id,
                        targetType: request.targetType,
                        targetId: request.targetId,
                        outcome
                    }
                },
                manager
            );
        });
    }

    private static buildReviewContent(
        request: DeletionRequest,
        outcome: 'approved' | 'rejected'
    ): string {
        const targetLabel =
            request.targetType === 'article'
                ? `文章 ${request.targetId}`
                : `剪贴板 ${request.targetId}`;
        const body =
            outcome === 'approved'
                ? `您对${targetLabel}的删除申请已通过，相关内容已被删除。`
                : `您对${targetLabel}的删除申请未通过。`;
        return request.resolutionComment ? `${body}\n处理备注：${request.resolutionComment}` : body;
    }

    private static normalizeComment(comment: unknown): string | null {
        const normalized = String(comment ?? '').trim();
        if (normalized.length > 500) {
            throw Object.assign(new Error('Comment is too long (max 500 chars)'), { status: 400 });
        }
        return normalized || null;
    }

    private static async findTarget(
        targetType: DeletionRequestTargetType,
        targetId: string
    ): Promise<Article | Paste | null> {
        if (targetType === 'article') {
            return await findOneServiceEntity<Article>(Article, { where: { id: targetId } });
        }
        return await findOneServiceEntity<Paste>(Paste, { where: { id: targetId } });
    }

    private static async buildAdminItems(
        rows: DeletionRequest[]
    ): Promise<AdminDeletionRequestItem[]> {
        const userIds = new Set<number>();
        for (const row of rows) {
            userIds.add(row.requesterId);
            if (row.handlerId) userIds.add(row.handlerId);
        }
        const users = userIds.size
            ? await findServiceEntities<RegisteredUser>(RegisteredUser, {
                  where: { id: In([...userIds]) }
              })
            : [];
        const userById = new Map(users.map(user => [user.id, user]));

        const articleIds = [
            ...new Set(rows.filter(r => r.targetType === 'article').map(r => r.targetId))
        ];
        const pasteIds = [
            ...new Set(rows.filter(r => r.targetType === 'paste').map(r => r.targetId))
        ];
        const articles = articleIds.length
            ? await findServiceEntities<Article>(Article, { where: { id: In(articleIds) } })
            : [];
        const pastes = pasteIds.length
            ? await findServiceEntities<Paste>(Paste, { where: { id: In(pasteIds) } })
            : [];
        const articleById = new Map(articles.map(article => [article.id, article]));
        const pasteById = new Map(pastes.map(paste => [paste.id, paste]));

        return rows.map(row => {
            const requester = userById.get(row.requesterId) ?? null;
            const handler = row.handlerId ? (userById.get(row.handlerId) ?? null) : null;
            const target =
                row.targetType === 'article'
                    ? (articleById.get(row.targetId) ?? null)
                    : (pasteById.get(row.targetId) ?? null);

            return {
                ...this.toItem(row),
                requester: requester
                    ? {
                          id: requester.id,
                          name: requester.name,
                          luoguUid: requester.luoguUid,
                          avatarUrl: requester.avatarUrl
                      }
                    : null,
                handler: handler ? { id: handler.id, name: handler.name } : null,
                target: {
                    exists: Boolean(target),
                    deleted: Boolean(target?.deleted),
                    title: row.targetType === 'article' && target ? (target as Article).title : null
                },
                requesterIsAuthor: Boolean(
                    requester && target && requester.luoguUid === target.authorId
                )
            };
        });
    }

    private static toItem(row: DeletionRequest): DeletionRequestItem {
        return {
            id: row.id,
            targetType: row.targetType,
            targetId: row.targetId,
            reason: row.reason,
            status: row.status,
            resolutionComment: row.resolutionComment ?? null,
            createdAt: row.createdAt,
            handledAt: row.handledAt ?? null
        };
    }
}
