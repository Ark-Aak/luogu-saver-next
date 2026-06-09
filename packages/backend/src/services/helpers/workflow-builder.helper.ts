import { TaskDefinition } from '@/utils/flow-validator';
import { QUEUE_NAMES } from '@/shared/constants';
import { FlowJob } from 'bullmq';
import { TaskType } from '@/shared/task';

interface FlowTask extends TaskDefinition {
    track?: boolean;
    type?: string;
}

type WorkflowBuildOptions = {
    workflowId: string;
    taskIds: Record<string, string>;
};

export class WorkflowBuilder {
    static resolveQueueName(task: FlowTask): string {
        const queueName = task.queueName || QUEUE_NAMES[task.data?.type as TaskType];
        if (!queueName) {
            throw new Error(`No queue name defined for workflow task: ${task.name}`);
        }
        return queueName;
    }

    static buildLinearFlow(tasks: FlowTask[], options: WorkflowBuildOptions): FlowJob {
        const sortedTasks = this.topologicalSort(tasks);

        let childNode: FlowJob | undefined = undefined;

        for (const [index, task] of sortedTasks.entries()) {
            const queueName = this.resolveQueueName(task);

            const isRoot = index === sortedTasks.length - 1;
            childNode = {
                name: task.name,
                queueName: queueName,
                opts: {
                    jobId: options.taskIds[task.name],
                    failParentOnFailure: true
                },
                data: {
                    ...task.data,
                    id: options.taskIds[task.name],
                    workflowId: options.workflowId,
                    taskName: task.name,
                    track: task.track,
                    report: task.report === true,
                    __isRoot: isRoot,
                    __fathers: task.fathers || []
                },
                children: childNode ? [childNode] : []
            };
        }

        if (!childNode) throw new Error('Workflow must contain at least one task');
        return childNode;
    }

    private static topologicalSort(tasks: FlowTask[]): FlowTask[] {
        const adj = new Map<string, string[]>();
        const inDegree = new Map<string, number>();
        const taskMap = new Map<string, FlowTask>();

        tasks.forEach(t => {
            taskMap.set(t.name, t);
            inDegree.set(t.name, 0);
            adj.set(t.name, []);
        });

        tasks.forEach(task => {
            (task.fathers || []).forEach(father => {
                if (adj.has(father)) {
                    adj.get(father)!.push(task.name);
                    inDegree.set(task.name, (inDegree.get(task.name) || 0) + 1);
                }
            });
        });

        const queue: string[] = [];
        inDegree.forEach((degree, name) => {
            if (degree === 0) queue.push(name);
        });

        const sorted: string[] = [];
        while (queue.length) {
            const u = queue.shift()!;
            sorted.push(u);
            const neighbors = adj.get(u) || [];
            for (const v of neighbors) {
                inDegree.set(v, inDegree.get(v)! - 1);
                if (inDegree.get(v) === 0) queue.push(v);
            }
        }

        if (sorted.length !== tasks.length) {
            throw new Error('Cycle detected or disconnected graph in workflow definition');
        }

        return sorted.map(name => taskMap.get(name)!);
    }
}
