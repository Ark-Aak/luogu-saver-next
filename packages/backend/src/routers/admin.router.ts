import Router from 'koa-router';
import { Context, DefaultState } from 'koa';
import { requiresPermission } from '@/middlewares/authorization';
import { Permission, ROLE_ADMIN } from '@/shared/permission';
import { RegisteredUser } from '@/entities/registered-user';
import { WorkflowService } from '@/services/workflow.service';
import { RegisteredUserService } from '@/services/registered-user.service';
import { AnnouncementService } from '@/services/announcement.service';

const router = new Router<DefaultState, Context>({ prefix: '/admin' });

router.get('/users', requiresPermission(Permission.MANAGE_USERS), async (ctx: Context) => {
    const users = await RegisteredUser.find({ order: { createdAt: 'DESC' } });

    ctx.success(
        users.map(user => ({
            id: user.id,
            luoguUid: user.luoguUid,
            name: user.name,
            avatarUrl: user.avatarUrl,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt,
            role: user.role
        }))
    );
});

router.patch(
    '/users/:uid/role',
    requiresPermission(Permission.MANAGE_USERS),
    async (ctx: Context) => {
        const uid = Number(ctx.params.uid);
        const { role } = ctx.request.body as { role?: number };

        if (!Number.isInteger(uid) || uid <= 0) {
            ctx.fail(400, 'Valid uid is required');
            return;
        }

        if (role === undefined || !Number.isInteger(role)) {
            ctx.fail(400, 'Valid role is required');
            return;
        }

        if (uid === ctx.user.id) {
            ctx.fail(400, 'Cannot change your own role');
            return;
        }

        const registeredUser = await RegisteredUser.findOne({ where: { id: uid } });
        if (!registeredUser) {
            ctx.fail(404, 'Registered user not found');
            return;
        }

        if (registeredUser.role === ROLE_ADMIN && ctx.user.role !== ROLE_ADMIN) {
            ctx.fail(403, 'Only admin can modify admin role');
            return;
        }

        await RegisteredUserService.updateRole(uid, role);
        ctx.success({ uid, role });
    }
);

router.post(
    '/search/reindex',
    requiresPermission(Permission.MANAGE_SEARCH),
    async (ctx: Context) => {
        const { batchSize } = ctx.request.body as { batchSize?: number };
        const result = await WorkflowService.createWorkflowFromTemplate('search-reindex-pipeline', {
            batchSize: batchSize || 100
        });
        ctx.success(result);
    }
);

router.post(
    '/articles/summary/rebuild',
    requiresPermission(Permission.MANAGE_SEARCH),
    async (ctx: Context) => {
        const { batchSize, concurrency } = ctx.request.body as {
            batchSize?: number;
            concurrency?: number;
        };
        const result = await WorkflowService.createWorkflowFromTemplate(
            'article-summary-rebuild-pipeline',
            {
                batchSize: batchSize || 20,
                concurrency: concurrency || 5
            }
        );
        ctx.success(result);
    }
);

router.post(
    '/articles/embedding/rebuild',
    requiresPermission(Permission.MANAGE_SEARCH),
    async (ctx: Context) => {
        const { batchSize, concurrency } = ctx.request.body as {
            batchSize?: number;
            concurrency?: number;
        };
        const result = await WorkflowService.createWorkflowFromTemplate(
            'article-embedding-rebuild-pipeline',
            {
                batchSize: batchSize || 20,
                concurrency: concurrency || 5
            }
        );
        ctx.success(result);
    }
);

router.get(
    '/announcement',
    requiresPermission(Permission.MANAGE_ANNOUNCEMENTS),
    async (ctx: Context) => {
        const announcement = await AnnouncementService.getAdminAnnouncement();
        ctx.success(announcement);
    }
);

router.put(
    '/announcement',
    requiresPermission(Permission.MANAGE_ANNOUNCEMENTS),
    async (ctx: Context) => {
        const announcement = await AnnouncementService.updateAnnouncement(ctx.request.body || {});
        ctx.success(announcement);
    }
);

export default router;
