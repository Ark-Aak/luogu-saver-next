<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import { NSpin, NDivider, NButton, NIcon, NEmpty, NTag } from 'naive-ui';
import {
    NewspaperOutline,
    ArrowForwardOutline,
    SparklesOutline,
    GlobeOutline
} from '@vicons/ionicons5';
import { FireAlt } from '@vicons/fa';

import { getRecommendations } from '@/api/recommendation';
import type { PlazaArticle } from '@/types/article';

import Card from '@/components/Card.vue';
import CardTitle from '@/components/CardTitle.vue';
import UserLink from '@/components/UserLink.vue';
import { getCategoryColor, getCategoryIcon, getCategoryLabel } from '@/utils/article.ts';
import { hexToRgba } from '@/utils/render.ts';

const router = useRouter();

const articles = ref<PlazaArticle[]>([]);
const loading = ref(false);
const error = ref(false);
const everReturned = ref(false);
const noMore = ref(false);

const loadMore = async () => {
    if (loading.value || noMore.value) return;

    loading.value = true;
    error.value = false;

    try {
        const excludedArticleIds = articles.value.map(article => article.id);
        const newArticles = (await getRecommendations(excludedArticleIds)).data || [];

        if (newArticles.length > 0) {
            everReturned.value = true;
            const existingIds = new Set(articles.value.map(a => a.id));
            const uniqueArticles = newArticles.filter(a => !existingIds.has(a.id));
            articles.value.push(...uniqueArticles);
        } else {
            if (articles.value.length > 0) {
                everReturned.value = true;
            }
            noMore.value = true;
            if (observer) {
                observer.disconnect();
                observer = null;
            }
        }
    } catch (err) {
        console.error(err);
        error.value = true;
    } finally {
        loading.value = false;
    }
};

const loadTrigger = ref<HTMLElement | null>(null);
let observer: IntersectionObserver | null = null;

onMounted(() => {
    loadMore();

    observer = new IntersectionObserver(
        entries => {
            if (entries[0]?.isIntersecting && !loading.value) {
                loadMore();
            }
        },
        {
            rootMargin: '200px',
            threshold: 0.1
        }
    );

    if (loadTrigger.value) {
        observer.observe(loadTrigger.value);
    }
});

onUnmounted(() => {
    if (observer) observer.disconnect();
});

const goToDetail = (id: string) => {
    const route = router.resolve({ path: `/article/${id}` });
    const newWin = window.open(route.href, '_blank');
    if (newWin) newWin.opener = null;
};
</script>

<template>
    <div class="plaza-page">
        <CardTitle title="文章广场" :icon="GlobeOutline" class="feed-header" chip="PLAZA">
            ARTICLE PLAZA!
        </CardTitle>

        <div class="feed-shell">
            <div class="article-list">
                <div v-for="article in articles" :key="article.id" class="article-item">
                    <Card
                        :title="article.title"
                        :icon="NewspaperOutline"
                        class="clickable-card"
                        @click="goToDetail(article.id)"
                    >
                        <template #title-extra>
                            <n-tag
                                v-if="article.reason === 'hot'"
                                :color="{
                                    textColor: 'var(--ui-orange-color)',
                                    color: 'color-mix(in srgb, var(--ui-orange-color) 20%, transparent)',
                                    borderColor: 'var(--ui-orange-color)'
                                }"
                                size="small"
                            >
                                <template #icon>
                                    <n-icon :component="FireAlt" />
                                </template>
                                热门
                            </n-tag>
                            <n-tag
                                v-else-if="article.reason === 'vector'"
                                :color="{
                                    textColor: 'var(--ui-cyan-color)',
                                    color: 'color-mix(in srgb, var(--ui-cyan-color) 20%, transparent)',
                                    borderColor: 'var(--ui-cyan-color)'
                                }"
                                size="small"
                            >
                                <template #icon>
                                    <n-icon :component="SparklesOutline" />
                                </template>
                                猜你想看
                            </n-tag>
                        </template>
                        <div class="article-card-body">
                            <div class="article-summary">
                                {{ article.summary || '暂无预览...' }}...
                            </div>

                            <div class="article-meta-wrap">
                                <n-divider style="margin: 12px 0" />

                                <div class="article-meta">
                                    <div class="left">
                                        <UserLink :user="article.author" show-avatar />
                                        <n-tag
                                            :color="{
                                                textColor: getCategoryColor(article.category),
                                                color: hexToRgba(
                                                    getCategoryColor(article.category),
                                                    0.2
                                                ),
                                                borderColor: getCategoryColor(article.category)
                                            }"
                                            size="small"
                                        >
                                            <template #icon>
                                                <n-icon
                                                    :component="getCategoryIcon(article.category)"
                                                />
                                            </template>
                                            {{ getCategoryLabel(article.category) }}
                                        </n-tag>
                                    </div>
                                    <div class="right">
                                        <n-button
                                            text
                                            size="small"
                                            type="primary"
                                            @click.stop="goToDetail(article.id)"
                                        >
                                            阅读全文
                                            <n-icon
                                                :component="ArrowForwardOutline"
                                                style="margin-left: 4px"
                                            />
                                        </n-button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </Card>
                </div>
            </div>
        </div>

        <div ref="loadTrigger" class="load-trigger">
            <div v-if="loading" class="loading-state">
                <n-spin size="small" />
                <span style="margin-left: 8px; color: var(--ui-muted-text-color)">正在加载更多推荐...</span>
            </div>

            <div v-else-if="error" class="error-state">
                <span style="color: var(--ui-error-color)">加载失败</span>
                <n-button size="small" style="margin-left: 10px" @click="loadMore">重试</n-button>
            </div>

            <n-empty
                v-else-if="noMore && everReturned"
                description="没有更多推荐了（你是真能看啊）"
            />
            <n-empty v-else-if="noMore && !everReturned" description="暂无推荐（你是真能看啊）" />
        </div>
    </div>
</template>

<style scoped>
.plaza-page {
    max-width: 1220px;
    margin: 0 auto;
}

.feed-header {
    margin-bottom: 18px;
}

.feed-shell {
    width: 100%;
}

.article-list {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 16px;
    align-items: stretch;
}

.article-item {
    min-width: 0;
    display: flex;
}

.article-item :deep(.saver-card) {
    width: 100%;
}

.article-item :deep(.card-content) {
    display: flex;
    flex: 1;
}

.article-card-body {
    display: flex;
    flex: 1;
    flex-direction: column;
}

.article-meta-wrap {
    margin-top: auto;
}

.clickable-card {
    cursor: pointer;
}

.article-summary {
    color: var(--ui-secondary-text-color);
    font-size: 14px;
    line-height: 1.65;
    margin-bottom: 6px;
}

.article-meta {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 14px;
    gap: 12px;
}

.article-meta .left {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 8px;
}

.load-trigger {
    padding: 20px 0;
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 50px;
}

.loading-state,
.error-state {
    display: flex;
    align-items: center;
}

@media (max-width: 900px) {
    .article-list {
        grid-template-columns: 1fr;
    }
}

@media (max-width: 560px) {
    .article-meta {
        align-items: flex-start;
        flex-direction: column;
    }
}
</style>
