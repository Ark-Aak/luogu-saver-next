export enum TaskStatus {
    PENDING = 0,
    RUNNING = 1,
    SUCCESS = 2,
    FAILED = 3
}

export enum TaskType {
    SAVE = 'save',
    AI_PROCESS = 'ai_process'
}

export interface Task {
    id: string;
    info: string | null;
    status: TaskStatus;
    createdAt: string | Date;
    type: TaskType;
    target: string | null;
    payload: any;
}
