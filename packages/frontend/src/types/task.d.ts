export interface TaskInfo {
    id: string;
    info: string | null;
    status: TaskStatus;
    createdAt: string | Date;
    type: TaskType;
    target: string | null;
    payload: any;
}

export interface CommonTask {
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
