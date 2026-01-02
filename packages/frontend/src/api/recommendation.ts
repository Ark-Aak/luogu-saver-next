import { apiFetch } from '@/utils/request.ts';
import type { ApiResponse } from '@/types/common';
import type { PlazaArticle } from '@/types/article';

export async function getRecommendations() {
    return (await apiFetch('/plaza/get')) as ApiResponse<PlazaArticle[]>;
}
