export interface CommonTask {
    id: string;
    type: TaskType;
    payload: {
        target: string;
        metadata: Record<string, any>;
        [key: string]: any;
    };
}

export interface SaveTask extends CommonTask {
    type: TaskType.SAVE;
    payload: {
        target: SaveTarget;
        targetId: string;
        metadata: Record<string, never>;
    };
}

export interface AiMetadata {
    model: string;
    // TODO: add more fields as needed
}

export interface AiTask extends CommonTask {
    type: TaskType.AI_PROCESS;
    payload: {
        target: string;
        metadata: AiMetadata;
    };
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
