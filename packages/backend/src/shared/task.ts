export interface CommonTask {
    id: string;
    type: TaskType;
    workflowId?: string;
    taskName?: string;
    track?: boolean;
    report?: boolean;
    __fathers?: string[];
    __isRoot?: boolean;
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

export interface SearchTask extends CommonTask {
    type: TaskType.SEARCH;
    payload: {
        target: SearchTarget;
        query?: string;
        metadata: {
            limit?: number;
            category?: number;
            authorId?: number;
        };
    };
}

export interface ReadTask extends CommonTask {
    type: TaskType.READ;
    payload: {
        target: ReadTarget;
        targetId?: string;
        metadata: {
            text?: string;
        };
    };
}

export interface RagTask extends CommonTask {
    type: TaskType.RAG;
    payload: {
        target: RagTarget;
        query?: string;
        metadata: {
            maxArticles?: number;
            maxChars?: number;
        };
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
    UPDATE = 'update',
    SEARCH = 'search',
    READ = 'read',
    RAG = 'rag'
}

export type TaskDefinition = {
    [TaskType.SAVE]: SaveTask;
    [TaskType.LLM]: AiTask;
    [TaskType.UPDATE]: CommonTask;
    [TaskType.SEARCH]: SearchTask;
    [TaskType.READ]: ReadTask;
    [TaskType.RAG]: RagTask;
};

export enum UpdateTarget {
    ARTICLE_SUMMARY = 'article_summary',
    ARTICLE_SUMMARY_REBUILD = 'article_summary_rebuild',
    ARTICLE_EMBEDDING = 'article_embedding',
    CENSOR = 'censor',
    SEARCH_INDEX = 'search_index',
    SEARCH_REINDEX = 'search_reindex'
}

export enum SaveTarget {
    ARTICLE = 'article',
    PASTE = 'paste',
    BENBEN = 'benben',
    JUDGEMENT = 'judgement',
    PROFILE = 'profile'
}

export enum SearchTarget {
    ARTICLE = 'article',
    VECTOR = 'vector'
}

export enum ReadTarget {
    TEXT = 'text',
    ARTICLE = 'article',
    PASTE = 'paste'
}

export enum RagTarget {
    CONTEXT = 'context',
    ANSWER = 'answer'
}

export enum CensorTarget {
    ARTICLE = 'article',
    PASTE = 'paste'
}
