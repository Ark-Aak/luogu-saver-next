import { apiFetch } from "@/utils/request.ts";
import type { ApiResponse } from "@/types/common";
import type { Article } from "@/types/article";

export async function getRecommendations() {
    return (await apiFetch('/plaza/get')) as ApiResponse<{ recommendation: Article[] }>;
}
