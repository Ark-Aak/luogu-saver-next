import { Context, Next } from 'koa';
import { Token } from '@/entities/token';
import { logger } from '@/lib/logger';
import { Permission } from '@/shared/permission';
import { WORKFLOW_TEMPLATES_PERMISSION } from '@/lib/workflow-templates';

export const authorization = async (ctx: Context, next: Next) => {
    if (ctx.headers['authorization']) {
        try {
            const token = ctx.headers['authorization'].replace('Bearer ', '') as string;
            const data = await Token.validate(token);
            if (data && data.length) {
                ctx.user = {
                    id: data[0],
                    role: data[1]
                };
            }
        } catch (error) {
            logger.error({ error }, 'Token validation failed');
        }
    }
    await next();
};

export const requiresPermission = (permissionBit: number) => async (ctx: Context, next: Next) => {
    if (!ctx.user || ctx.user.id === undefined) {
        ctx.fail(401, 'Unauthorized');
        return;
    }

    const role = ctx.user.role;

    if (!(role & Permission.LOGIN)) {
        ctx.fail(403, 'You have been banned');
        return;
    }

    if ((role & permissionBit) !== permissionBit) {
        ctx.fail(403, 'Permission denied');
        return;
    }

    await next();
};

export const checkWorkflowPermission = async (ctx: Context, next: Next) => {
    const templateId = ctx.params.name;
    const permission = WORKFLOW_TEMPLATES_PERMISSION[templateId];
    if (!permission) {
        ctx.fail(400, 'Invalid workflow template');
        return;
    }
    if (!ctx.user || ctx.user.id === undefined) {
        ctx.fail(401, 'Unauthorized');
        return;
    }

    const role = ctx.user.role;

    if (!(role & Permission.LOGIN)) {
        ctx.fail(403, 'You have been banned');
        return;
    }

    if ((role & permission) !== permission) {
        ctx.fail(403, 'Permission denied');
        return;
    }

    await next();
};
