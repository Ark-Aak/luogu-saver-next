import { apiFetch } from '@/utils/request.ts';
import type { ApiResponse } from '@/types/common';

export interface CreateWorkflowTemplateResponse {
    workflowId: string;
    taskIds: Record<string, string>;
    reportTaskIds: Record<string, string>;
    trackTaskIds: Record<string, string>;
}

export interface WorkflowTaskNode {
    taskId: string | null;
    taskName: string;
    status: 'pending' | 'processing' | 'completed' | 'failed' | 'missing';
    type: string | null;
    target: string | null;
    fathers: string[];
    fatherIds: Record<string, string>;
    track: boolean;
    report: boolean;
    info: string | null;
}

export interface WorkflowDetailResponse {
    workflowId: string;
    status: string;
    createdAt: string;
    updatedAt: string;
    tasks: WorkflowTaskNode[];
    result: Record<string, { result: { data: any }; name: string }> | null;
}

export async function createWorkflowFromTemplate(name: string, params: Record<string, unknown>) {
    return (await apiFetch(`/workflow/create/template/${name}`, {
        method: 'POST',
        data: params
    })) as ApiResponse<CreateWorkflowTemplateResponse>;
}

export async function getWorkflowById(id: string) {
    return (await apiFetch(`/workflow/query/${id}`)) as ApiResponse<WorkflowDetailResponse>;
}
