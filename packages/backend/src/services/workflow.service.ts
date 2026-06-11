import { FlowProducer, Job, JobNode } from 'bullmq';
import { config } from '@/config';
import { Workflow } from '@/entities/workflow';
import { Task } from '@/entities/task';
import { logger } from '@/lib/logger';
import { validateFlowStructure, WorkflowDefinition } from '@/utils/flow-validator';
import { WORKFLOW_TEMPLATES } from '@/lib/workflow-templates';
import { randomUUID } from 'node:crypto';
import { WorkflowBuilder } from './helpers/workflow-builder.helper';
import { getQueueByName } from '@/lib/queue-factory';
import { WorkflowStatusStore } from '@/services/helpers/workflow-status-store.helper';
import {
    findOneServiceEntity,
    getServiceRepository,
    saveServiceEntity
} from '@/services/helpers/repository.helper';
import { TaskStatus } from '@/shared/task';
import { getRandomString } from '@/utils/string';

export class WorkflowService {
    private static _flowProducer: FlowProducer;

    private static get flowProducer() {
        if (!this._flowProducer) {
            this._flowProducer = new FlowProducer({
                connection: {
                    host: config.redis.host,
                    port: config.redis.port,
                    password: config.redis.password
                },
                prefix: config.redis.keyPrefix
            });
        }
        return this._flowProducer;
    }

    static async createWorkflow(definition: WorkflowDefinition) {
        validateFlowStructure(definition);
        await this.ensureWorkflowQueueCapacity(definition);

        const workflowId = randomUUID();
        const taskIds = this.createTaskIds(definition);
        const rootJobNode = WorkflowBuilder.buildLinearFlow(definition.tasks, {
            workflowId,
            taskIds
        });
        const rootJobId = rootJobNode.opts?.jobId;
        if (!rootJobId) {
            throw new Error('Workflow root job ID missing');
        }
        const reportTaskIds = this.pickTaskIds(
            taskIds,
            definition.tasks.filter(task => task.report === true).map(task => task.name)
        );

        const result: Record<string, any> = {};
        definition.tasks.forEach(task => {
            if (task.track && taskIds[task.name]) {
                result[task.name] = null;
            }
        });

        const workflow = Workflow.create({
            id: workflowId,
            rootJobId,
            queueName: rootJobNode.queueName,
            definition,
            status: 'active',
            result
        });

        try {
            await saveServiceEntity<Workflow>(Workflow, workflow);
            await this.createWorkflowTasks(definition, taskIds);
            await this.flowProducer.add(rootJobNode);
        } catch (error) {
            try {
                await getServiceRepository<Task>(Task).delete(Object.values(taskIds));
                await getServiceRepository<Workflow>(Workflow).delete({ id: workflowId });
            } catch (cleanupError) {
                logger.error({ cleanupError, workflowId }, 'Failed to clean up workflow row');
            }
            throw error;
        }
        logger.info({ workflowId, rootJobId: workflow.rootJobId }, 'Workflow created');

        return {
            workflowId,
            rootJobId,
            taskIds,
            reportTaskIds
        };
    }

    static async createWorkflowFromTemplate(templateName: string, params: any) {
        const templateBuilders = new Map<string, unknown>(Object.entries(WORKFLOW_TEMPLATES));
        const builder = templateBuilders.get(templateName);
        if (builder === undefined) throw new Error(`Template ${templateName} not found`);

        if (typeof builder !== 'function') {
            throw new Error(`Template ${templateName} is invalid`);
        }

        if (templateName !== 'article-save-pipeline') {
            return this.createWorkflow(builder(params));
        }

        return this.createWorkflow(builder(params));
    }

    static async getWorkflowById(id: string) {
        const workflow = await findOneServiceEntity<Workflow>(Workflow, { where: { id } });
        if (!workflow) return null;

        if (workflow.status === 'expired') {
            return this.formatWorkflowResponse(workflow, null);
        }

        try {
            await this.syncWorkflowStatus(workflow);

            const flowStructure = await this.flowProducer.getFlow({
                id: workflow.rootJobId,
                queueName: workflow.queueName
            });

            if (!flowStructure) throw new Error('Flow structure missing in Redis');

            const tasks = await this.transformFlowTree(flowStructure);
            return this.formatWorkflowResponse(workflow, tasks);
        } catch (error) {
            logger.warn(
                { err: error, workflowId: id },
                'Workflow execution info unavailable, marking expired'
            );

            const storedStatus = await WorkflowStatusStore.updateById(id, 'expired');
            workflow.status = storedStatus || workflow.status;

            return this.formatWorkflowResponse(workflow, null);
        }
    }

    private static async syncWorkflowStatus(workflow: Workflow): Promise<void> {
        const queueWrapper = getQueueByName(workflow.queueName);
        if (!queueWrapper) return;

        const job = await Job.fromId(queueWrapper.queue, workflow.rootJobId);
        if (!job) {
            throw new Error('Root job not found');
        }

        const state = await job.getState();
        if (state && state !== workflow.status) {
            const storedStatus = await WorkflowStatusStore.updateById(workflow.id, state);
            workflow.status = storedStatus || workflow.status;
        }
    }

    private static createTaskIds(definition: WorkflowDefinition): Record<string, string> {
        return Object.fromEntries(definition.tasks.map(task => [task.name, getRandomString(16)]));
    }

    private static pickTaskIds(
        taskIds: Record<string, string>,
        taskNames: string[]
    ): Record<string, string> {
        return Object.fromEntries(taskNames.map(name => [name, taskIds[name]]));
    }

    private static async createWorkflowTasks(
        definition: WorkflowDefinition,
        taskIds: Record<string, string>
    ) {
        const tasks = definition.tasks.map(taskDef =>
            Task.create({
                id: taskIds[taskDef.name],
                type: taskDef.data.type,
                payload: taskDef.data.payload,
                status: TaskStatus.PENDING,
                info: null
            })
        );

        await getServiceRepository<Task>(Task).save(tasks);
    }

    private static async ensureWorkflowQueueCapacity(definition: WorkflowDefinition) {
        const jobsByQueue = new Map<string, number>();

        for (const task of definition.tasks) {
            const queueName = WorkflowBuilder.resolveQueueName(task);
            jobsByQueue.set(queueName, (jobsByQueue.get(queueName) || 0) + 1);
        }

        for (const [queueName, jobsToAdd] of jobsByQueue) {
            const queueWrapper = getQueueByName(queueName);
            if (await queueWrapper.wouldExceedMaxLength(jobsToAdd)) {
                throw new Error('Queue is full. Please try again later.');
            }
        }
    }

    private static async transformFlowTree(flowNode: JobNode): Promise<any[]> {
        if (!flowNode.job) return [];

        const status = await flowNode.job.getState();
        const current = {
            jobId: flowNode.job.id,
            jobName: flowNode.job.name,
            status
        };

        let childrenResult: any[] = [];
        if (flowNode.children) {
            const childrenPromises = flowNode.children.map(child => this.transformFlowTree(child));
            const nested = await Promise.all(childrenPromises);
            childrenResult = nested.flat();
        }

        return [...childrenResult, current];
    }

    private static formatWorkflowResponse(workflow: Workflow, tasks: any) {
        return {
            workflowId: workflow.id,
            status: workflow.status,
            createdAt: workflow.createdAt,
            updatedAt: workflow.updatedAt,
            tasks,
            result: workflow.result
        };
    }
}
