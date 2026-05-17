import { Workflow } from '@/entities/workflow';
import { In, Not } from 'typeorm';

const TERMINAL_WORKFLOW_STATUSES = ['completed', 'failed', 'expired'];

export class WorkflowStatusStore {
    static async updateById(id: string, status: string): Promise<string | null> {
        const result = await Workflow.update(
            { id, status: Not(In(TERMINAL_WORKFLOW_STATUSES)) },
            { status }
        );

        if (result.affected && result.affected > 0) {
            return status;
        }

        return this.getStatusById(id);
    }

    static async updateByRootJobId(rootJobId: string, status: string): Promise<number> {
        const result = await Workflow.update(
            { rootJobId, status: Not(In(TERMINAL_WORKFLOW_STATUSES)) },
            { status }
        );

        return result.affected || 0;
    }

    private static async getStatusById(id: string): Promise<string | null> {
        const workflow = await Workflow.findOne({
            where: { id },
            select: ['status']
        });

        return workflow?.status || null;
    }
}
