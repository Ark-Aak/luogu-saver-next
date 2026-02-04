export interface TaskDefinition {
    name: string;
    data?: any;
    fathers?: string[];
    [key: string]: any;
}

export function validateFlowStructure(tasks: TaskDefinition[]): void {
    if (!Array.isArray(tasks)) {
        throw new Error('Flow definition must be an array of tasks');
    }

    const taskMap = new Map<string, TaskDefinition>();

    for (const task of tasks) {
        if (!task.name) {
            throw new Error('All tasks must have a name');
        }
        if (taskMap.has(task.name)) {
            throw new Error(`Duplicate task name found: ${task.name}`);
        }
        taskMap.set(task.name, task);
    }

    for (const task of tasks) {
        if (task.fathers) {
            if (!Array.isArray(task.fathers)) {
                throw new Error(`Fathers for task ${task.name} must be an array`);
            }
            for (const fatherName of task.fathers) {
                if (!taskMap.has(fatherName)) {
                    throw new Error(`Task ${task.name} depends on unknown father: ${fatherName}`);
                }
            }
        }
    }
    detectCycles(tasks, taskMap);
}

function detectCycles(tasks: TaskDefinition[], taskMap: Map<string, TaskDefinition>) {
    const visited = new Set<string>();
    const recursionStack = new Set<string>();

    const visit = (taskName: string) => {
        if (recursionStack.has(taskName)) {
            throw new Error(`Cycle detected involving task: ${taskName}`);
        }
        if (visited.has(taskName)) {
            return;
        }

        visited.add(taskName);
        recursionStack.add(taskName);

        const task = taskMap.get(taskName);
        if (task && task.fathers) {
            for (const fatherName of task.fathers) {
                visit(fatherName);
            }
        }

        recursionStack.delete(taskName);
    };

    for (const task of tasks) {
        if (!visited.has(task.name)) {
            visit(task.name);
        }
    }
}
