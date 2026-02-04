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
        metadata: {
            forceUpdate?: boolean;
        };
    };
}

export interface AiTask extends CommonTask {
    type: TaskType.LLM;
    payload: {
        target: 'summary' | 'embedding' | 'chat';
        sourceId?: string;
        metadata: Record<string, never>;
    };
}

export interface UpdateTask extends CommonTask {
    type: TaskType.UPDATE;
    payload: {
        target: UpdateTarget;
        targetId: string;
        metadata: Record<string, any>;
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
    LLM = 'llm',
    UPDATE = 'update'
}

export type TaskDefinition = {
    [TaskType.SAVE]: SaveTask;
    [TaskType.LLM]: AiTask;
    [TaskType.UPDATE]: CommonTask;
};

export enum UpdateTarget {
    ARTICLE_SUMMARY = 'article_summary',
    ARTICLE_EMBEDDING = 'article_embedding',
    CENSOR = 'censor'
}

export enum SaveTarget {
    ARTICLE = 'article',
    PASTE = 'paste',
    BENBEN = 'benben',
    JUDGEMENT = 'judgement',
    PROFILE = 'profile'
}

export enum CensorTarget {
    ARTICLE = 'article',
    PASTE = 'paste'
}
