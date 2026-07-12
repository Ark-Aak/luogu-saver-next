import { config } from '@/config';
import { Task } from '@/entities/task';
import { Workflow } from '@/entities/workflow';
import { WorkflowDeduplication } from '@/entities/workflow-deduplication';
import { logger } from '@/lib/logger';
import { getServiceRepository } from '@/services/helpers/repository.helper';
import { WorkflowHelper } from '@/services/helpers/workflow.helper';
import { TaskStatus } from '@/shared/task';
import { In, IsNull, LessThan } from 'typeorm';

const TERMINAL_WORKFLOW_STATUSES = ['completed', 'failed', 'expired'];
const TERMINAL_TASK_STATUSES = [TaskStatus.COMPLETED, TaskStatus.FAILED];

export class WorkflowCleanupService {
    private static timer: NodeJS.Timeout | null = null;
    private static running = false;

    static start() {
        const cleanupConfig = config.workflow.cleanup;
        if (!cleanupConfig.enabled) {
            logger.info('Workflow cleanup scheduler disabled.');
            return;
        }

        if (this.timer) return;

        const scheduleNext = (delayMs: number) => {
            this.timer = setTimeout(() => {
                void this.runOnce()
                    .catch(error => {
                        logger.error({ err: error }, 'Workflow cleanup pass failed');
                    })
                    .finally(() => scheduleNext(cleanupConfig.intervalMs));
            }, delayMs);
            this.timer.unref?.();
        };

        scheduleNext(cleanupConfig.initialDelayMs);
        logger.info(
            {
                intervalMs: cleanupConfig.intervalMs,
                initialDelayMs: cleanupConfig.initialDelayMs,
                terminalRetentionMs: cleanupConfig.terminalRetentionMs,
                legacyTaskRetentionMs: cleanupConfig.legacyTaskRetentionMs,
                batchSize: cleanupConfig.batchSize
            },
            'Workflow cleanup scheduler started'
        );
    }

    static stop() {
        if (!this.timer) return;
        clearTimeout(this.timer);
        this.timer = null;
        logger.info('Workflow cleanup scheduler stopped.');
    }

    static async runOnce() {
        if (this.running) {
            logger.debug('Workflow cleanup pass skipped because another pass is running');
            return;
        }

        this.running = true;
        try {
            const deletedWorkflowCount = await this.cleanupTerminalWorkflows();
            const deletedLegacyTaskCount = await this.cleanupLegacyTasks();
            logger.info(
                {
                    deletedWorkflowCount,
                    deletedLegacyTaskCount
                },
                'Workflow cleanup pass completed'
            );
        } finally {
            this.running = false;
        }
    }

    static async cleanupRuntimeForWorkflow(workflowId: string) {
        const taskRows = await getServiceRepository<Task>(Task).find({
            where: { workflowId },
            select: ['id']
        });

        await WorkflowHelper.cleanupRuntime(taskRows.map(task => task.id));
    }

    private static async cleanupTerminalWorkflows() {
        const cleanupConfig = config.workflow.cleanup;
        const cutoff = new Date(Date.now() - cleanupConfig.terminalRetentionMs);
        const workflows = await getServiceRepository<Workflow>(Workflow).find({
            where: {
                status: In(TERMINAL_WORKFLOW_STATUSES),
                updatedAt: LessThan(cutoff)
            },
            order: { updatedAt: 'ASC' },
            take: cleanupConfig.batchSize
        });

        let deletedCount = 0;
        for (const workflow of workflows) {
            try {
                await this.deleteWorkflow(workflow.id);
                deletedCount += 1;
            } catch (error) {
                logger.error(
                    { err: error, workflowId: workflow.id },
                    'Failed to clean up terminal workflow'
                );
            }
        }

        return deletedCount;
    }

    private static async deleteWorkflow(workflowId: string) {
        const taskRows = await getServiceRepository<Task>(Task).find({
            where: { workflowId },
            select: ['id']
        });
        const taskIds = taskRows.map(task => task.id);

        await WorkflowHelper.cleanupRuntime(taskIds);

        await Workflow.transaction(async manager => {
            await getServiceRepository<WorkflowDeduplication>(
                WorkflowDeduplication,
                manager
            ).delete({ workflowId });
            await getServiceRepository<Task>(Task, manager).delete({ workflowId });
            await getServiceRepository<Workflow>(Workflow, manager).delete({ id: workflowId });
        });

        logger.info(
            {
                workflowId,
                taskCount: taskIds.length
            },
            'Terminal workflow SQL rows cleaned up'
        );
    }

    private static async cleanupLegacyTasks() {
        const cleanupConfig = config.workflow.cleanup;
        const cutoff = new Date(Date.now() - cleanupConfig.legacyTaskRetentionMs);
        const taskRows = await getServiceRepository<Task>(Task).find({
            where: {
                workflowId: IsNull(),
                status: In(TERMINAL_TASK_STATUSES),
                updatedAt: LessThan(cutoff)
            },
            order: { updatedAt: 'ASC' },
            take: cleanupConfig.batchSize,
            select: ['id']
        });

        if (taskRows.length === 0) return 0;

        const taskIds = taskRows.map(task => task.id);
        await getServiceRepository<Task>(Task).delete({ id: In(taskIds) });
        logger.info({ taskIds }, 'Legacy terminal task SQL rows cleaned up');
        return taskIds.length;
    }
}
