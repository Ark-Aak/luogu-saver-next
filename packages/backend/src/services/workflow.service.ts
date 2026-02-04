import { FlowProducer, Job, JobNode, QueueEvents } from 'bullmq';
import { config } from '@/config';
import { getQueueByName } from '@/lib/queue-factory';
import { Workflow } from '@/entities/workflow';
import { QUEUE_NAMES } from '@/shared/constants';
import { logger } from '@/lib/logger';
import { TaskDefinition, validateFlowStructure } from '@/utils/flow-validator';

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

    private static linearizeWorkflow(tasks: TaskDefinition[]): any {
        const adj = new Map<string, string[]>(); // key -> dependants
        const inDegree = new Map<string, number>();
        const taskMap = new Map<string, TaskDefinition>();

        tasks.forEach(task => {
            taskMap.set(task.name, task);
            inDegree.set(task.name, 0);
            adj.set(task.name, []);
        });

        tasks.forEach(task => {
            if (task.fathers) {
                task.fathers.forEach(fatherName => {
                    if (adj.has(fatherName)) {
                        adj.get(fatherName)!.push(task.name);
                        inDegree.set(task.name, (inDegree.get(task.name) || 0) + 1);
                    }
                });
            }
        });

        const queue: string[] = [];
        inDegree.forEach((degree, name) => {
            if (degree === 0) queue.push(name);
        });

        const sortedNames: string[] = [];
        while (queue.length > 0) {
            const u = queue.shift()!;
            sortedNames.push(u);
            if (adj.has(u)) {
                for (const v of adj.get(u)!) {
                    inDegree.set(v, inDegree.get(v)! - 1);
                    if (inDegree.get(v) === 0) {
                        queue.push(v);
                    }
                }
            }
        }

        if (sortedNames.length !== tasks.length) {
            throw new Error('Cycle detected or disconnected graph issues during linearization');
        }

        // Build BullMQ Flow Chain
        // Execution Order: sortedNames[0] -> sortedNames[1] -> ... -> sortedNames[last]
        // BullMQ Definition: Last -> child: Second Last -> ... -> child: First

        let childNode: any = null;

        for (const name of sortedNames) {
            const task = taskMap.get(name)!;
            // Current node becomes child of the next node in execution order (which is parent in BullMQ tree)
            // WAIT.
            // If A runs after B. BullMQ: A depends on B. A is Parent.
            // sortedNames: [B, A].
            // Loop 1: B. childNode = B.
            // Loop 2: A. A.children = [B]. childNode = A.
            childNode = {
                name: task.name,
                queueName: task.queueName,
                data: { ...task.data, __fathers: task.fathers || [] },
                children: childNode ? [childNode] : []
            };
        }

        return childNode;
    }

    private static async transformFlow(
        flowNode: JobNode
    ): Promise<{ jobId: string; jobName: string; status: string }[] | null> {
        if (!flowNode || !flowNode.job) return null;

        const status = await flowNode.job.getState();
        const simplifiedChildren = [];

        if (flowNode.children) {
            for (const child of flowNode.children) {
                const childTransformed = await this.transformFlow(child);
                if (childTransformed) {
                    simplifiedChildren.push(...childTransformed);
                }
            }
        }

        return [
            ...simplifiedChildren,
            {
                jobId: flowNode.job.id || 'unknown',
                jobName: flowNode.job.name || 'unnamed',
                status
            }
        ];
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
        validateFlowStructure(flowDef);

        const flowProducer = this.getFlowProducer();
        const linearDef = this.linearizeWorkflow(flowDef);
        const preparedDef = this.inferQueueName(linearDef);
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
     *   createdAt: Date,
     *   updatedAt: Date,
     *   tasks: any
     * } | null>} The workflow details including its task structure, or null if not found or expired.
     */
    static async getWorkflowById(id: string): Promise<{
        id: string;
        rootJobId: string;
        status: string;
        createdAt: Date;
        updatedAt: Date;
        tasks: any;
    } | null> {
        const workflow = await Workflow.findOne({ where: { id } });
        if (!workflow) return null;
        try {
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
                status: workflow.status,
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
