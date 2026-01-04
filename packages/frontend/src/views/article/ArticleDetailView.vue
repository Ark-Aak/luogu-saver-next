<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import {
    useMessage,
    NSpace,
    NButton,
    NIcon,
    NTag,
    NDivider,
    NGrid,
    NGi,
    NSkeleton,
    NAnchor,
    NAnchorLink,
    NTimeline,
    NTimelineItem,
    NSpin
} from 'naive-ui';
import {
    ShareSocialOutline,
    CopyOutline,
    SyncOutline,
    TrashOutline,
    ArrowBackOutline,
    NewspaperOutline,
    CalendarOutline,
    ListOutline,
    TimeOutline
} from '@vicons/ionicons5';

import { useContentSaver } from '@/composables/useContentSaver';
import { getArticleById, getRelevant, getArticleHistory, saveArticle } from '@/api/article';
import type { Article, PlazaArticle, TocItem } from '@/types/article';
import { hexToRgba } from '@/utils/render.ts';
import { getCategoryLabel, getCategoryColor, getCategoryIcon, generateTocAndProcessHtml } from '@/utils/article';

import Card from '@/components/Card.vue';
import SidebarWidget from '@/components/SidebarWidget.vue';
import UserLink from '@/components/UserLink.vue';
import MarkdownViewer from '@/components/MarkdownViewer.vue';
import LoadingSkeleton from '@/components/LoadingSkeleton.vue';
import { ARTICLE_CATEGORIES, CACHE_STORAGE_KEY, UNKNOWN_CATEGORY } from '@/utils/constants';
import { formatDate } from '@/utils/render';

import { useLocalStorage } from "@/composables/useLocalStorage.ts";

const route = useRoute();
const router = useRouter();
const message = useMessage();
const { isSaving, hasUpdate, handle404, setupUpdateListener, handleRefresh } = useContentSaver();

const articleId = route.params.id as string;
const article = ref<Article | null>(null);
const loading = ref(true);

const recommended = ref<PlazaArticle[]>([]);
const recLoading = ref(false);
const displayContent = ref('');

const tocItems = ref<TocItem[]>([]);

interface VersionItem {
    version: number;
    createdAt: string;
    title?: string;
}
const versionHistory = ref<VersionItem[]>([]);

const triggerRefresh = () => {
    handleRefresh(loadData);
};

const lastUpdate = useLocalStorage(CACHE_STORAGE_KEY + `_article_${articleId}_updated_at`, 0);
if ((Date.now() - lastUpdate.value) > 60 * 60 * 1000) {
	// Request update automatically if last update was more than 1 hour ago
	console.log('Auto update triggered for article', articleId);
	saveArticle(articleId);
	lastUpdate.value = Date.now();
}

const loadRelevant = async () => {
    if (!articleId) return;
    recLoading.value = true;
    try {
        const res = await getRelevant(articleId);
        const items: PlazaArticle[] = res.data;
        recommended.value = items || [];
    } catch (err: any) {
        console.error(err);
        message.error('获取相关推荐失败');
    } finally {
        recLoading.value = false;
    }
};

const loadHistory = async () => {
    if (!articleId) return;
    try {
        const res = await getArticleHistory(articleId);
        if (res.data) {
            versionHistory.value = res.data
                .map(h => ({
                    version: h.version,
                    createdAt: h.createdAt,
                    title: h.title
                }))
                .sort((a, b) => b.version - a.version);
        }
    } catch (err) {
        console.error('Failed to load history', err);
    }
};

const loadData = async () => {
    loading.value = true;
    try {
        const res = await getArticleById(articleId);
        if (res.code === 404) {
            handle404(() => saveArticle(articleId));
            return;
        }
        article.value = res.data;

        if (article.value?.renderedContent) {
            const result = generateTocAndProcessHtml(article.value.renderedContent);
            displayContent.value = result.html;
            tocItems.value = result.toc;
        }

        await Promise.all([loadRelevant(), loadHistory()]);
    } catch (err: any) {
        message.error(err.message || '加载失败');
    } finally {
        loading.value = false;
    }
};

setupUpdateListener(`article_${articleId}`, 'article:updated', loadData);

const openArticle = (id: string) => {
    const route = router.resolve({ path: `/article/${id}` });
    const newWin = window.open(route.href, '_blank');
    if (newWin) newWin.opener = null;
};

const handleCopy = async () => {
    if (article.value?.content) {
        try {
            await navigator.clipboard.writeText(article.value.content);
            message.success('源码已复制到剪贴板');
        } catch (err) {
            message.error('复制失败');
        }
    }
};

const handleUpdate = async () => {
    if (!articleId) return;
    try {
        await saveArticle(articleId);
        message.success('更新请求已提交');
    } catch (err: any) {
        message.error(err.message || '更新请求失败');
    }
};

const handleDelete = () => {
    message.info('删除功能暂未开放');
};

const currentCategory = computed(() => {
    if (article.value?.category && ARTICLE_CATEGORIES[article.value.category]) {
        return ARTICLE_CATEGORIES[article.value.category] || UNKNOWN_CATEGORY;
    }
    return UNKNOWN_CATEGORY;
});

onMounted(() => {
    loadData();
});
</script>

<template>
    <n-spin :show="isSaving" description="正在保存并处理..." class="saving-spin">
        <n-grid :x-gap="16" cols="1 l:8" responsive="screen">
            <n-gi :span="1" class="sidebar-left">
                <SidebarWidget title="目录" :icon="ListOutline" class="toc-card" v-if="tocItems.length > 0">
                    <n-anchor :show-rail="true" :show-background="true" type="block" :bound="100">
                        <template v-for="item in tocItems" :key="item.href">
                            <n-anchor-link :title="item.title" :href="item.href">
                                <n-anchor-link
                                    v-for="child in item.children"
                                    :key="child.href"
                                    :title="child.title"
                                    :href="child.href"
                                />
                            </n-anchor-link>
                        </template>
                    </n-anchor>
                </SidebarWidget>
            </n-gi>

            <n-gi :span="6" class="main-content">
                <LoadingSkeleton :loading="loading">
                    <template #skeleton>
                        <Card>
                            <div style="margin-bottom: 8px">
                                <n-skeleton text style="width: 40%; height: 28px; margin-bottom: 8px" />
                            </div>
                            <n-divider style="margin: 12px 0" />
                            <n-grid x-gap="12" cols="1 s:2">
                                <n-gi>
                                    <div class="info-item">
                                        <span class="label">作者</span>
                                        <div style="display: flex; align-items: center; gap: 8px; margin-top: 4px">
                                            <n-skeleton circle size="small" />
                                            <n-skeleton text style="width: 80px" />
                                        </div>
                                    </div>
                                </n-gi>
                                <n-gi>
                                    <div class="info-item">
                                        <span class="label">分类</span>
                                        <div style="display: flex; align-items: center; gap: 8px; margin-top: 4px">
                                            <n-skeleton width="18px" height="18px" />
                                            <n-skeleton text style="width: 60px" />
                                        </div>
                                    </div>
                                </n-gi>
                            </n-grid>
                        </Card>
                    </template>

                    <div v-if="article">
                        <Card :title="article.title" :icon="NewspaperOutline">
                            <div class="meta-row">
                                <n-tag :bordered="false" size="small">
                                    <template #icon>
                                        <NIcon :component="CalendarOutline" />
                                    </template>
                                    更新于 {{ formatDate(article.updatedAt) }}
                                </n-tag>
                            </div>

                            <n-divider style="margin: 12px 0" />

                            <n-grid x-gap="12" cols="1 s:2">
                                <n-gi>
                                    <div class="info-item">
                                        <span class="label">作者</span>
                                        <UserLink :user="article.author" show-avatar />
                                    </div>
                                </n-gi>
                                <n-gi>
                                    <div class="info-item">
                                        <span class="label">分类</span>
                                        <div class="category-link">
                                            <NIcon :component="currentCategory.icon" :color="currentCategory.color" />
                                            <span :style="{ color: currentCategory.color }">{{
                                                currentCategory.label
                                            }}</span>
                                        </div>
                                    </div>
                                </n-gi>
                            </n-grid>

                            <n-divider style="margin: 12px 0" />

                            <n-space>
                                <n-button size="small" @click="router.go(-1)">
                                    <template #icon>
                                        <NIcon :component="ArrowBackOutline" />
                                    </template>
                                    返回
                                </n-button>
                                <n-button
                                    size="small"
                                    secondary
                                    tag="a"
                                    :href="`https://www.luogu.com/article/${article.id}`"
                                    target="_blank"
                                >
                                    <template #icon>
                                        <NIcon :component="ShareSocialOutline" />
                                    </template>
                                    原站
                                </n-button>
                                <n-button size="small" secondary @click="handleCopy">
                                    <template #icon>
                                        <NIcon :component="CopyOutline" />
                                    </template>
                                    源码
                                </n-button>
                                <n-button size="small" type="primary" @click="handleUpdate">
                                    <template #icon>
                                        <NIcon :component="SyncOutline" />
                                    </template>
                                    更新
                                </n-button>
                                <n-button size="small" type="error" ghost @click="handleDelete">
                                    <template #icon>
                                        <NIcon :component="TrashOutline" />
                                    </template>
                                    删除
                                </n-button>
                            </n-space>
                        </Card>
                    </div>
                </LoadingSkeleton>

                <div style="margin-top: 16px">
                    <LoadingSkeleton :loading="loading">
                        <template #skeleton>
                            <Card>
                                <n-space vertical size="large">
                                    <n-space vertical>
                                        <n-skeleton text :repeat="2" />
                                        <n-skeleton text style="width: 60%" />
                                    </n-space>
                                    <n-skeleton height="120px" style="border-radius: 4px" />
                                    <n-space vertical>
                                        <n-skeleton text :repeat="4" />
                                    </n-space>
                                </n-space>
                            </Card>
                        </template>

                        <Card v-if="article">
                            <MarkdownViewer :content="displayContent" />
                        </Card>
                    </LoadingSkeleton>
                </div>

                <div style="margin-top: 20px">
                    <LoadingSkeleton :loading="recLoading">
                        <template #skeleton>
                            <Card title="相关推荐">
                                <div class="article-list">
                                    <div v-for="i in 3" :key="i" class="article-item">
                                        <n-skeleton text :repeat="2" />
                                    </div>
                                </div>
                            </Card>
                        </template>

                        <Card title="相关推荐" v-if="recommended.length">
                            <div class="article-list">
                                <div v-for="it in recommended" :key="it.id" class="article-item">
                                    <Card
                                        :title="it.title"
                                        :icon="NewspaperOutline"
                                        class="clickable-card"
                                        @click="openArticle(it.id)"
                                    >
                                        <template #title-extra>
                                            <n-tag
                                                v-if="it.reason === 'title'"
                                                :color="{
                                                    textColor: '#ff6200',
                                                    color: 'rgba(255, 98, 0, 0.15)',
                                                    borderColor: '#ff6200'
                                                }"
                                                size="small"
                                            >
                                                标题相关
                                            </n-tag>
                                            <n-tag
                                                v-else-if="it.reason === 'vector'"
                                                :color="{
                                                    textColor: '#00aaff',
                                                    color: 'rgba(0, 170, 255, 0.15)',
                                                    borderColor: '#00aaff'
                                                }"
                                                size="small"
                                            >
                                                相似文章
                                            </n-tag>
                                        </template>

                                        <div class="article-summary">
                                            {{ it.summary || '暂无预览...' }}
                                        </div>

                                        <n-divider style="margin: 12px 0" />

                                        <div class="article-meta">
                                            <div class="left">
                                                <UserLink :user="it.author" show-avatar />
                                                <n-tag
                                                    :color="{
                                                        textColor: getCategoryColor(it.category),
                                                        color: hexToRgba(getCategoryColor(it.category), 0.2),
                                                        borderColor: getCategoryColor(it.category)
                                                    }"
                                                    size="small"
                                                    style="margin-left: 8px"
                                                >
                                                    <template #icon>
                                                        <n-icon :component="getCategoryIcon(it.category)" />
                                                    </template>
                                                    {{ getCategoryLabel(it.category) }}
                                                </n-tag>
                                            </div>
                                            <div class="right">
                                                <n-button
                                                    text
                                                    size="small"
                                                    type="primary"
                                                    @click.stop="openArticle(it.id)"
                                                >
                                                    阅读全文
                                                </n-button>
                                            </div>
                                        </div>
                                    </Card>
                                </div>
                            </div>
                        </Card>
                    </LoadingSkeleton>
                </div>
            </n-gi>

            <n-gi :span="1" class="sidebar-right" v-if="versionHistory.length > 0">
                <SidebarWidget title="历史版本" :icon="TimeOutline" class="version-card">
                    <n-timeline>
                        <n-timeline-item
                            v-for="ver in versionHistory"
                            :key="ver.version"
                            :title="`版本 ${ver.version}`"
                            :content="ver.title"
                            :time="ver.createdAt"
                            :type="ver.version === versionHistory[0]?.version ? 'success' : 'default'"
                        />
                    </n-timeline>
                </SidebarWidget>
            </n-gi>
        </n-grid>
    </n-spin>

    <div v-if="hasUpdate" class="update-floater">
        <n-button type="primary" circle size="large" @click="triggerRefresh" class="shadow-button">
            <template #icon>
                <NIcon :component="SyncOutline" />
            </template>
        </n-button>
    </div>
</template>

<style scoped>
.sidebar-left,
.sidebar-right {
    display: block;
}

.toc-card,
.version-card {
    position: sticky;
    top: 20px;
}

.meta-row {
    margin-bottom: 8px;
    display: flex;
    gap: 8px;
}

.info-item {
    background: #f9fafb;
    padding: 8px 12px;
    border-radius: 4px;
    display: flex;
    flex-direction: column;
    gap: 4px;
}

.label {
    font-size: 12px;
    color: #999;
}

.category-link {
    display: flex;
    align-items: center;
    gap: 6px;
    font-weight: 600;
}

.article-list {
    display: flex;
    flex-direction: column;
    gap: 12px;
}
.article-item {
    margin-bottom: 0;
}
.clickable-card {
    cursor: pointer;
}
.article-summary {
    color: #555;
    font-size: 14px;
    line-height: 1.6;
    margin-bottom: 8px;
}
.article-meta {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 14px;
}
.article-meta .left {
    display: flex;
    align-items: center;
}

.update-floater {
    position: fixed;
    bottom: 32px;
    left: 260px;
    z-index: 999;
    animation: slide-in 0.3s ease-out;
}

.shadow-button {
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

@keyframes slide-in {
    from {
        transform: translateY(100%);
        opacity: 0;
    }
    to {
        transform: translateY(0);
        opacity: 1;
    }
}

/* noinspection CssUnusedSymbol */
.saving-spin :deep(.n-spin-body) {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
}
</style>
