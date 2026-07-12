import { apiFetch } from '@/utils/request.ts';
import type { ApiResponse } from '@/types/common';
import type { Article, PlazaArticle, ArticleHistory } from '@/types/article';
import { createWorkflowFromTemplate } from '@/api/workflow.ts';

export async function getArticleById(id: string) {
    return (await apiFetch(`/article/query/${id}`)) as ApiResponse<Article>;
}

export async function getArticlesByIds(ids: string[]) {
    if (ids.length === 0) return { code: 200, message: 'OK', data: [] } as ApiResponse<Article[]>;
    const chunks: string[][] = [];
    for (let i = 0; i < ids.length; i += 100) {
        chunks.push(ids.slice(i, i + 100));
    }
    const results = await Promise.all(
        chunks.map(chunk =>
            apiFetch('/article/query/batch', {
                method: 'POST',
                data: { ids: chunk }
            })
        )
    );
    const allArticles = results.flatMap(r => (r as ApiResponse<Article[]>).data ?? []);
    return { code: 200, message: 'OK', data: allArticles } as ApiResponse<Article[]>;
}

export async function getRecentArticles(
    count: number,
    updatedAfter?: string,
    truncatedCount?: number
) {
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

export async function getRelevant(id: string) {
    return (await apiFetch(`/article/relevant/${id}`)) as ApiResponse<PlazaArticle[]>;
}

export async function getArticleHistory(id: string) {
    return (await apiFetch(`/article/history/${id}`)) as ApiResponse<ArticleHistory[]>;
}

export async function saveArticle(id: string) {
    return await createWorkflowFromTemplate('article-save-pipeline', {
        targetId: id
    });
}
