import { apiFetch } from '@/utils/request.ts';
import type { ApiResponse } from '@/types/common';

export async function renderMarkdown(content: string) {
    return (await apiFetch('/markdown/render', {
        method: 'POST',
        data: { content }
    })) as ApiResponse<{ html: string }>;
}
