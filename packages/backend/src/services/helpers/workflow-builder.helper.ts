import { TaskDefinition } from '@/utils/flow-validator';
import { QUEUE_NAMES } from '@/shared/constants';
import { FlowJob } from 'bullmq';

interface FlowTask extends TaskDefinition {
    track?: boolean;
    type?: string;
}

export class WorkflowBuilder {
    static buildLinearFlow(tasks: FlowTask[], workflowId: string): FlowJob {
        const sortedTasks = this.topologicalSort(tasks);

        let childNode: FlowJob | undefined = undefined;

        for (const task of sortedTasks) {
            // @ts-expect-error ignore
            const queueName = task.queueName || QUEUE_NAMES[task.data?.type] || 'default';

            childNode = {
                name: task.name,
                queueName: queueName,
                data: {
                    ...task.data,
                    workflowId,
                    taskName: task.name,
                    track: task.track,
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
