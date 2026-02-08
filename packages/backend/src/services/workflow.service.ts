import { FlowProducer, JobNode, Job } from 'bullmq';
import { config } from '@/config';
import { Workflow } from '@/entities/workflow';
import { logger } from '@/lib/logger';
import { validateFlowStructure } from '@/utils/flow-validator';
import { WORKFLOW_TEMPLATES } from '@/lib/workflow-templates';
import { randomUUID } from 'node:crypto';
import { WorkflowBuilder } from './helpers/workflow-builder.helper';
import { getQueueByName } from '@/lib/queue-factory';

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
        const jobNode = await this.flowProducer.add(rootJobNode);
        const jobIds = this.extractJobIds(jobNode);

        const result: Record<string, any> = {};
        flowDef.forEach(task => {
            if (task.track && jobIds[task.name]) {
                result[task.name] = null;
            }
        });

        const workflow = Workflow.create({
            id: workflowId,
            rootJobId: jobNode.job.id!,
            queueName: jobNode.job.queueName,
            definition: flowDef,
            status: 'active',
            result
        });

        await workflow.save();
        logger.info({ workflowId, rootJobId: workflow.rootJobId }, 'Workflow created');

        return {
            workflowId,
            rootJobId: workflow.rootJobId,
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

            workflow.status = 'expired';
            await Workflow.update({ id }, { status: 'expired' });

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
            workflow.status = state;
            await Workflow.update({ id: workflow.id }, { status: state });
        }
    }

    private static extractJobIds(node: JobNode): Record<string, string> {
        const map: Record<string, string> = {};
        const traverse = (n: JobNode) => {
            if (n.job?.name && n.job?.id) map[n.job.name] = n.job.id;
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
            id: workflow.id,
            status: workflow.status,
            createdAt: workflow.createdAt,
            updatedAt: workflow.updatedAt,
            tasks,
            result: workflow.result
        };
    }
}
