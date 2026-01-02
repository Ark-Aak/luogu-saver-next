export interface CommonTask {
    id: string;
    type: TaskType;
    payload: {
        target: string;
        [key: string]: any;
    };
}

export interface SaveTask extends CommonTask {
    type: TaskType.SAVE;
    payload: {
        target: SaveTarget;
        targetId: string;
        metadata: Record<string, any>;
    };
}

export interface AiTask extends CommonTask {
    type: TaskType.AI_PROCESS;
    payload: {
        target: string;
        metadata: Record<string, any>;
    };
}

export interface TaskHandler<T extends CommonTask> {
    handle(task: T): Promise<void>;
    taskType: string;
}

export enum TaskStatus {
    PENDING = 0,
    PROCESSING = 1,
    COMPLETED = 2,
    FAILED = 3
}

export enum TaskType {
    SAVE = 'save',
    AI_PROCESS = 'ai_process'
}

export type TaskDefinition = {
    [TaskType.SAVE]: SaveTask;
    [TaskType.AI_PROCESS]: AiTask;
};

export enum SaveTarget {
    ARTICLE = 'article',
    PASTE = 'paste',
    BENBEN = 'benben',
    JUDGEMENT = 'judgement',
    PROFILE = 'profile'
}
