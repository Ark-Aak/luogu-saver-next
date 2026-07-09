import { computed, ref, type Ref } from 'vue';
import { useLocalStorage } from '@/composables/useLocalStorage.ts';
import { RAG_KNOWLEDGE_BASE_STORAGE_KEY } from '@/utils/constants.ts';

export interface KnowledgeBaseArticle {
    id: string;
    title: string;
    addedAt: string;
}

let sharedStorage: Ref<KnowledgeBaseArticle[] | null> | null = null;

function getStorage(): Ref<KnowledgeBaseArticle[] | null> {
    if (!sharedStorage) {
        sharedStorage = useLocalStorage<KnowledgeBaseArticle[]>(RAG_KNOWLEDGE_BASE_STORAGE_KEY, []);
    }
    return sharedStorage;
}

function normalizeItems(value: unknown): KnowledgeBaseArticle[] {
    if (!Array.isArray(value)) return [];
    const seen = new Set<string>();
    const items: KnowledgeBaseArticle[] = [];

    for (const item of value) {
        const id = String(item?.id || '').trim();
        if (!id || seen.has(id)) continue;
        items.push({
            id,
            title: String(item?.title || id),
            addedAt: String(item?.addedAt || new Date().toISOString())
        });
        seen.add(id);
        if (items.length >= 10) break;
    }

    return items;
}

export function useKnowledgeBase() {
    const storage = getStorage();
    const articles = computed({
        get: () => normalizeItems(storage.value),
        set: value => {
            storage.value = normalizeItems(value);
        }
    });

    function getArticles() {
        return articles.value;
    }

    const articleIds = computed(() => articles.value.map(article => article.id));

    function getArticleIds() {
        return articleIds.value;
    }

    function hasArticle(articleId: string) {
        return articleIds.value.includes(articleId);
    }

    function addArticle(article: { id: string; title: string }) {
        const id = String(article.id || '').trim();
        if (!id) return { ok: false, reason: 'invalid' as const };
        if (hasArticle(id)) return { ok: true, reason: 'exists' as const };
        if (articles.value.length >= 10) return { ok: false, reason: 'limit' as const };

        articles.value = [
            ...articles.value,
            {
                id,
                title: article.title || id,
                addedAt: new Date().toISOString()
            }
        ];
        return { ok: true, reason: 'added' as const };
    }

    function removeArticle(articleId: string) {
        articles.value = articles.value.filter(article => article.id !== articleId);
    }

    function clearArticles() {
        articles.value = [];
    }

    return {
        articles,
        articleIds,
        getArticles,
        getArticleIds,
        hasArticle,
        addArticle,
        removeArticle,
        clearArticles
    };
}

export function useKnowledgeBaseSafe() {
    if (typeof window === 'undefined') {
        const articles = ref<KnowledgeBaseArticle[]>([]);
        const articleIds = computed(() => articles.value.map(article => article.id));
        return {
            articles,
            articleIds,
            getArticles: () => [],
            getArticleIds: () => [],
            hasArticle: () => false,
            addArticle: () => ({ ok: false, reason: 'invalid' as const }),
            removeArticle: () => {},
            clearArticles: () => {}
        };
    }

    return useKnowledgeBase();
}
