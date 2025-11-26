import { apiFetch } from '@/utils/request.ts';
import type { ApiResponse } from "@/types/common";
import type { Article } from "@/types/article";

export async function getArticleById(id: string) {
    return (await apiFetch(`/article/query/${id}`)) as ApiResponse<Article>;
}

export async function getRecentArticles(count: number, updatedAfter?: string, truncatedCount?: number) {
    const params = new URLSearchParams();
    params.append('count', count.toString());
    if (updatedAfter) {
        params.append('updated_after', updatedAfter);
    }
    if (truncatedCount) {
        params.append('truncated_count', truncatedCount.toString());
    }
    return (await apiFetch(`/article/recent?${params.toString()}`)) as ApiResponse<Article[]>;
}

export async function getArticleCount() {
    return (await apiFetch('/article/count')) as ApiResponse<{ count: number }>;
}