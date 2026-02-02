import { FlowProducer, Job, QueueEvents } from 'bullmq';
import { config } from '@/config';
import { getQueueByName } from '@/lib/queue-factory';
import { Workflow } from '@/entities/workflow';
import { QUEUE_NAMES } from '@/shared/constants';
import { logger } from '@/lib/logger';

export class WorkflowService {
    private static flowProducer: FlowProducer;
    private static queueEvents: Map<string, QueueEvents> = new Map();

    private static getFlowProducer() {
        if (!this.flowProducer) {
            this.flowProducer = new FlowProducer({
                connection: {
                    host: config.redis.host,
                    port: config.redis.port,
                    password: config.redis.password
                }
            });
            this.setupQueueEvents();
        }
        return this.flowProducer;
    }

    private static setupQueueEvents() {
        if (this.queueEvents.size > 0) return;

        Object.values(QUEUE_NAMES).forEach(queueName => {
            const events = new QueueEvents(queueName, {
                connection: {
                    host: config.redis.host,
                    port: config.redis.port,
                    password: config.redis.password
                }
            });

            events.on('completed', async ({ jobId }) => {
                await this.updateWorkflowStatus(jobId, 'completed');
            });

            events.on('failed', async ({ jobId, failedReason }) => {
                await this.updateWorkflowStatus(jobId, 'failed', failedReason);
            });

            this.queueEvents.set(queueName, events);
        });
    }

    private static async updateWorkflowStatus(jobId: string, status: string, reason?: string) {
        try {
            const workflow = await Workflow.findOne({ where: { rootJobId: jobId } });
            if (workflow) {
                workflow.status = status;
                await workflow.save();
                logger.info({ workflowId: workflow.id, status, reason }, 'Workflow status updated');
            }
        } catch (err) {
            logger.error({ err, jobId }, 'Failed to update workflow status');
        }
    }

    private static inferQueueName(def: any): any {
        if (!def.queueName && def.data?.type) {
            const type = def.data.type;
            // @ts-expect-error ignore
            def.queueName = QUEUE_NAMES[type] || 'default';
        }

        if (def.children) {
            def.children = def.children.map((child: any) => this.inferQueueName(child));
        }
        return def;
    }

    private static async transformFlow(flowNode: any): Promise<any> {
        if (!flowNode || !flowNode.job) return null;

        const status = await flowNode.job.getState();
        const simplifiedChildren = [];

        if (flowNode.children) {
            for (const child of flowNode.children) {
                simplifiedChildren.push(await this.transformFlow(child));
            }
        }

        return {
            jobId: flowNode.job.id,
            status,
            children: simplifiedChildren
        };
    }

    /**
     * Creates a new workflow based on the provided flow definition.
     * This method initializes the flow producer, prepares the flow definition by inferring queue names,
     * adds the flow to the queue, and persists the workflow metadata in the database.
     *
     * @param {any} flowDef - The definition of the flow (job tree) to be executed.
     * @returns {Promise<{
     *   workflowId: string,
     *   jobId: string,
     *   name: string,
     *   queueName: string
     * }>} An object containing the new workflow's ID, root job ID, name, and queue name.
     */
    static async createWorkflow(flowDef: any): Promise<{
        workflowId: string;
        jobId: string;
        name: string;
        queueName: string;
    }> {
        const flowProducer = this.getFlowProducer();
        const preparedDef = this.inferQueueName(flowDef);
        const jobNode = await flowProducer.add(preparedDef);

        const workflow = new Workflow();
        workflow.rootJobId = jobNode.job.id!;
        workflow.queueName = jobNode.job.queueName;
        workflow.definition = flowDef;
        workflow.status = 'active';
        await workflow.save();

        return {
            workflowId: workflow.id,
            jobId: jobNode.job.id || 'unknown',
            name: jobNode.job.name,
            queueName: jobNode.job.queueName
        };
    }

    /**
     * Retrieves a workflow by its unique identifier.
     * This method fetches the workflow record, validates its state against the actual job state in the queue,
     * retrieves the full flow structure from the producer, and transforms it into a detailed response.
     * If the root job cannot be found (e.g., expired), the workflow record is removed.
     *
     * @param {string} id - The unique identifier of the workflow to retrieve.
     * @returns {Promise<{
     *   id: string,
     *   rootJobId: string,
     *   queueName: string,
     *   status: string,
     *   definition: any,
     *   createdAt: Date,
     *   updatedAt: Date,
     *   tasks: any
     * } | null>} The workflow details including its task structure, or null if not found or expired.
     */
    static async getWorkflowById(id: string): Promise<{
        id: string;
        rootJobId: string;
        queueName: string;
        status: string;
        definition: any;
        createdAt: Date;
        updatedAt: Date;
        tasks: any;
    } | null> {
        const workflow = await Workflow.findOne({ where: { id } });
        if (!workflow) return null;

        try {
            this.getFlowProducer();

            const queueWrapper = getQueueByName(workflow.queueName);
            if (!queueWrapper) {
                throw new Error(`Queue wrapper for ${workflow.queueName} could not be obtained`);
            }

            if (workflow.status !== 'completed' && workflow.status !== 'failed') {
                const job = await Job.fromId(queueWrapper.queue, workflow.rootJobId);
                if (!job) {
                    throw new Error(`Root job ${workflow.rootJobId} not found in queue`);
                }
                const state = await job.getState();
                if (state !== workflow.status) {
                    workflow.status = state;
                    await workflow.save();
                }
            }

            const flowProducer = this.getFlowProducer();
            const flow = await flowProducer.getFlow({
                id: workflow.rootJobId,
                queueName: workflow.queueName
            });

            if (!flow) {
                throw new Error('Flow structure not found');
            }

            const tasks = await this.transformFlow(flow);

            return {
                id: workflow.id,
                rootJobId: workflow.rootJobId,
                queueName: workflow.queueName,
                status: workflow.status,
                definition: workflow.definition,
                createdAt: workflow.createdAt,
                updatedAt: workflow.updatedAt,
                tasks
            };
        } catch (error) {
            logger.info({ error, id }, 'Workflow expired. Deleting workflow record.');
            await workflow.remove();
            return null;
        }
    }
}
