import { apiFetch } from '@/utils/request.ts';
import type { ApiResponse } from '@/types/common';
import type { PlazaArticle } from '@/types/article';

export async function getRecommendations(exclude: string[] = []) {
    return (await apiFetch('/plaza/get', {
        params: {
            exclude: exclude.join(',')
        }
    })) as ApiResponse<PlazaArticle[]>;
}
