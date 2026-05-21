<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import {
    NEmpty,
    NButton,
    NGi,
    NGrid,
    NIcon,
    NInput,
    NPagination,
    NSelect,
    NSpace,
    NSpin,
    NTag,
    useMessage
} from 'naive-ui';
import { SearchOutline, NewspaperOutline, PersonOutline, CalendarOutline } from '@vicons/ionicons5';
import CardTitle from '@/components/CardTitle.vue';
import Card from '@/components/Card.vue';
import { searchArticles, type ArticleSearchHit } from '@/api/search.ts';
import { ARTICLE_CATEGORIES, UNKNOWN_CATEGORY } from '@/utils/constants.ts';

const route = useRoute();
const router = useRouter();
const message = useMessage();

const query = ref((route.query.q as string) || '');
const category = ref<number | null>(route.query.category ? Number(route.query.category) : null);
const page = ref(Number(route.query.page) || 1);
const limit = 12;
const loading = ref(false);
const hits = ref<ArticleSearchHit[]>([]);
const total = ref(0);
const processingTimeMs = ref(0);

const categoryOptions = computed(() => [
    { label: '全部分类', value: null },
    ...Object.entries(ARTICLE_CATEGORIES)
        .filter(([key]) => Number(key) !== 9)
        .map(([key, item]) => ({ label: item.label, value: Number(key) }))
]);

function getCategory(categoryId: number) {
    return ARTICLE_CATEGORIES[categoryId] || UNKNOWN_CATEGORY;
}

function updateRoute() {
    router.replace({
        path: '/search',
        query: {
            q: query.value || undefined,
            category: category.value || undefined,
            page: page.value > 1 ? page.value : undefined
        }
    });
}

async function loadSearch() {
    loading.value = true;
    try {
        const response = await searchArticles({
            q: query.value,
            category: category.value,
            page: page.value,
            limit
        });

        if (response.code !== 200) {
            message.error(response.message);
            return;
        }

        hits.value = response.data.hits;
        total.value = response.data.total;
        processingTimeMs.value = response.data.processingTimeMs;
    } catch (error) {
        message.error(error instanceof Error ? error.message : '搜索失败');
    } finally {
        loading.value = false;
    }
}

function handleSearch() {
    page.value = 1;
    updateRoute();
    loadSearch();
}

function openArticle(id: string) {
    router.push(`/article/${id}`);
}

function renderMarkedText(value: string | undefined, fallback: string = '') {
    const raw = value || fallback;
    const escaped = raw
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');

    return escaped.replace(/&lt;mark&gt;/g, '<mark>').replace(/&lt;\/mark&gt;/g, '</mark>');
}

watch(
    () => route.query,
    value => {
        query.value = (value.q as string) || '';
        category.value = value.category ? Number(value.category) : null;
        page.value = Number(value.page) || 1;
        loadSearch();
    }
);

onMounted(loadSearch);
</script>

<template>
    <div class="search-page">
        <CardTitle title="搜索" :icon="SearchOutline" class="search-header" chip="ARTICLE SEARCH">
            SEARCH ARTICLES
        </CardTitle>

        <Card class="search-controls">
            <n-grid :x-gap="12" :y-gap="12" cols="1 m:4" responsive="screen">
                <n-gi span="1 m:2">
                    <n-input
                        v-model:value="query"
                        clearable
                        placeholder="输入文章标题、摘要、正文关键词或作者名"
                        @keydown.enter="handleSearch"
                    >
                        <template #prefix>
                            <n-icon :component="SearchOutline" />
                        </template>
                    </n-input>
                </n-gi>
                <n-gi>
                    <n-select v-model:value="category" :options="categoryOptions" clearable />
                </n-gi>
                <n-gi>
                    <n-button type="primary" block @click="handleSearch">搜索</n-button>
                </n-gi>
            </n-grid>
        </Card>

        <div class="result-meta">
            <span>共 {{ total }} 条结果</span>
            <span>耗时 {{ processingTimeMs }} ms</span>
        </div>

        <n-spin :show="loading">
            <div v-if="hits.length" class="result-grid">
                <Card
                    v-for="item in hits"
                    :key="item.id"
                    :title-html="renderMarkedText(item.formatted?.title, item.title)"
                    :icon="NewspaperOutline"
                    class="result-card"
                    @click="openArticle(item.id)"
                >
                    <div class="result-body">
                        <p
                            class="summary"
                            v-html="
                                renderMarkedText(
                                    item.formatted?.summary,
                                    item.summary || '暂无摘要'
                                )
                            "
                        ></p>
                    </div>
                    <n-space align="center" justify="space-between" class="result-footer">
                        <n-space size="small" align="center">
                            <n-tag size="small" :bordered="false">
                                <template #icon>
                                    <n-icon :component="getCategory(item.category).icon" />
                                </template>
                                {{ getCategory(item.category).label }}
                            </n-tag>
                            <span class="meta-item">
                                <n-icon :component="PersonOutline" />
                                <span
                                    v-html="
                                        renderMarkedText(
                                            item.formatted?.authorName,
                                            item.authorName || '-'
                                        )
                                    "
                                />
                            </span>
                        </n-space>
                        <span class="meta-item">
                            <n-icon :component="CalendarOutline" />
                            {{ new Date(item.updatedAt).toLocaleDateString() }}
                        </span>
                    </n-space>
                </Card>
            </div>
            <n-empty v-else-if="!loading" description="没有搜索结果" />
        </n-spin>

        <div v-if="total > limit" class="pagination">
            <n-pagination
                v-model:page="page"
                :page-size="limit"
                :item-count="total"
                @update:page="
                    () => {
                        updateRoute();
                        loadSearch();
                    }
                "
            />
        </div>
    </div>
</template>

<style scoped>
.search-page {
    max-width: 1220px;
    margin: 0 auto;
}

.search-header,
.search-controls {
    margin-bottom: 16px;
}

.result-meta {
    display: flex;
    justify-content: space-between;
    margin: 4px 4px 14px;
    color: #64748b;
    font-size: 13px;
}

.result-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 14px;
}

.result-card {
    cursor: pointer;
}

.result-card :deep(.saver-card) {
    height: 100%;
}

.result-card :deep(.card-content) {
    display: flex;
    flex-direction: column;
}

.result-body {
    flex: 1;
}

.summary {
    min-height: 54px;
    margin: 0 0 14px;
    color: #475569;
    line-height: 1.7;
    display: -webkit-box;
    -webkit-line-clamp: 5;
    -webkit-box-orient: vertical;
    overflow: hidden;
}

.result-footer {
    color: #64748b;
    font-size: 13px;
}

.meta-item {
    display: inline-flex;
    align-items: center;
    gap: 4px;
}

.pagination {
    display: flex;
    justify-content: center;
    margin-top: 20px;
}

@media (max-width: 900px) {
    .result-grid {
        grid-template-columns: 1fr;
    }
}
</style>
