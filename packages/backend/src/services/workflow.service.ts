import { FlowJob, FlowProducer, Job, JobNode } from 'bullmq';
import { config } from '@/config';
import { Workflow } from '@/entities/workflow';
import { logger } from '@/lib/logger';
import { validateFlowStructure } from '@/utils/flow-validator';
import { WORKFLOW_TEMPLATES } from '@/lib/workflow-templates';
import { randomUUID } from 'node:crypto';
import { WorkflowBuilder } from './helpers/workflow-builder.helper';
import { getQueueByName } from '@/lib/queue-factory';
import { WorkflowStatusStore } from '@/services/helpers/workflow-status-store.helper';

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

    static async createWorkflow(flowDef: any[]) {
        validateFlowStructure(flowDef);

        const workflowId = randomUUID();
        const rootJobNode = WorkflowBuilder.buildLinearFlow(flowDef, workflowId);
        const rootJobId = rootJobNode.opts?.jobId;
        if (!rootJobId) {
            throw new Error('Workflow root job ID missing');
        }
        const jobIds = this.extractJobIdsFromDefinition(rootJobNode);

        const result: Record<string, any> = {};
        flowDef.forEach(task => {
            if (task.track && jobIds[task.name]) {
                result[task.name] = null;
            }
        });

        const workflow = Workflow.create({
            id: workflowId,
            rootJobId,
            queueName: rootJobNode.queueName,
            definition: flowDef,
            status: 'active',
            result
        });

        try {
            await workflow.save();
            await this.flowProducer.add(rootJobNode);
        } catch (error) {
            try {
                await Workflow.delete({ id: workflowId });
            } catch (cleanupError) {
                logger.error({ cleanupError, workflowId }, 'Failed to clean up workflow row');
            }
            throw error;
        }
        logger.info({ workflowId, rootJobId: workflow.rootJobId }, 'Workflow created');

        return {
            workflowId,
            taskId: rootJobId,
            jobIds
        };
    }

    static async createWorkflowFromTemplate(templateName: string, params: any) {
        const builder = WORKFLOW_TEMPLATES[templateName];
        if (!builder) throw new Error(`Template ${templateName} not found`);
        return this.createWorkflow(builder(params));
    }

    static async getWorkflowById(id: string) {
        const workflow = await Workflow.findOne({ where: { id } });
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

    private static extractJobIdsFromDefinition(node: FlowJob): Record<string, string> {
        const map: Record<string, string> = {};
        const traverse = (n: FlowJob) => {
            if (n.name && n.opts?.jobId) map[n.name] = n.opts.jobId;
            n.children?.forEach(traverse);
        };
        traverse(node);
        return map;
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
