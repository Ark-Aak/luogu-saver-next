import { apiFetch } from '@/utils/request.ts';
import type { ApiResponse } from '@/types/common';

interface CreateWorkflowTemplateResponse {
    workflowId: string;
    rootJobId: string;
    taskIds: Record<string, string>;
    reportTaskIds: Record<string, string>;
}

export async function createWorkflowFromTemplate(name: string, params: Record<string, unknown>) {
    return (await apiFetch(`/workflow/create/template/${name}`, {
        method: 'POST',
        data: params
    })) as ApiResponse<CreateWorkflowTemplateResponse>;
}

export async function getWorkflowById(id: string) {
    return (await apiFetch(`/workflow/query/${id}`)) as ApiResponse<{
        id: string;
        status: string;
        result: Record<string, { result: { data: any }; name: string }> | null;
    }>;
}
