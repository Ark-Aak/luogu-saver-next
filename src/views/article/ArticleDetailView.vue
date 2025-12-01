<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useMessage, useDialog, NSpace, NButton, NIcon, NTag, NDivider, NGrid, NGi, NSkeleton } from 'naive-ui';
import {
	ShareSocialOutline, CopyOutline, SyncOutline, TrashOutline,
	ArrowBackOutline, NewspaperOutline, CalendarOutline
} from '@vicons/ionicons5';

import { getArticleById, getRelevant } from '@/api/article';
import type { Article, PlazaArticle } from '@/types/article';
import { hexToRgba } from '@/utils/render.ts';

import Card from '@/components/Card.vue';
import UserLink from '@/components/UserLink.vue';
import MarkdownViewer from '@/components/MarkdownViewer.vue';
import LoadingSkeleton from '@/components/LoadingSkeleton.vue';
import { ARTICLE_CATEGORIES, UNKNOWN_CATEGORY } from '@/utils/constants';
import { formatDate } from '@/utils/render';

const route = useRoute();
const router = useRouter();
const message = useMessage();
const dialog = useDialog();

const articleId = route.params.id as string;
const article = ref<Article | null>(null);
const loading = ref(true);

const recommended = ref<PlazaArticle[]>([]);
const recLoading = ref(false);

const getCategoryLabel = (id?: number) => {
	if (id && ARTICLE_CATEGORIES[id]) return ARTICLE_CATEGORIES[id].label;
	return ARTICLE_CATEGORIES[9].label;
};
const getCategoryColor = (id?: number) => {
	if (id && ARTICLE_CATEGORIES[id]) return ARTICLE_CATEGORIES[id].color;
	return ARTICLE_CATEGORIES[9].color;
};
const getCategoryIcon = (id?: number) => {
	if (id && ARTICLE_CATEGORIES[id]) return ARTICLE_CATEGORIES[id].icon;
	return ARTICLE_CATEGORIES[9].icon;
};

const loadRelevant = async () => {
	if (!articleId) return;
	recLoading.value = true;
	try {
		const res = await getRelevant(articleId);
		const items: PlazaArticle[] = res.data.relevant;
		recommended.value = items || [];
	} catch (err: any) {
		console.error(err);
		message.error('获取相关推荐失败');
	} finally {
		recLoading.value = false;
	}
};

const loadData = async () => {
	loading.value = true;
	try {
		const res = await getArticleById(articleId);
		article.value = res.data;
		await loadRelevant();
	} catch (err: any) {
		message.error(err.message || '加载失败');
	} finally {
		loading.value = false;
	}
};

const openArticle = (id: string) => {
	const route = router.resolve({ path: `/article/${id}` });
	const newWin = window.open(route.href, '_blank');
	if (newWin) newWin.opener = null;
};

const currentCategory = computed(() => {
	if (article.value?.category && ARTICLE_CATEGORIES[article.value.category]) {
		return ARTICLE_CATEGORIES[article.value.category];
	}
	return UNKNOWN_CATEGORY;
});

onMounted(() => {
	loadData();
});
</script>

<template>
	<div class="article-detail-page">
		
		<LoadingSkeleton :loading="loading">
			<template #skeleton>
				<Card>
					<div style="margin-bottom: 8px;">
						<n-skeleton text style="width: 40%; height: 28px; margin-bottom: 8px;"/>
					</div>
					<n-divider style="margin: 12px 0"/>
					<n-grid x-gap="12" cols="1 s:2">
						<n-gi>
							<div class="info-item">
								<span class="label">作者</span>
								<div style="display: flex; align-items: center; gap: 8px; margin-top: 4px;">
									<n-skeleton circle size="small"/>
									<n-skeleton text style="width: 80px"/>
								</div>
							</div>
						</n-gi>
						<n-gi>
							<div class="info-item">
								<span class="label">分类</span>
								<div style="display: flex; align-items: center; gap: 8px; margin-top: 4px;">
									<n-skeleton width="18px" height="18px"/>
									<n-skeleton text style="width: 60px"/>
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
								<NIcon :component="CalendarOutline"/>
							</template>
							更新于 {{ formatDate(article.updatedAt) }}
						</n-tag>
					</div>
					
					<n-divider style="margin: 12px 0"/>
					
					<n-grid x-gap="12" cols="1 s:2">
						<n-gi>
							<div class="info-item">
								<span class="label">作者</span>
								<UserLink :user="article.author" show-avatar/>
							</div>
						</n-gi>
						<n-gi>
							<div class="info-item">
								<span class="label">分类</span>
								<div class="category-link">
									<NIcon :component="currentCategory.icon" :color="currentCategory.color"/>
									<span :style="{ color: currentCategory.color }">{{ currentCategory.label }}</span>
								</div>
							</div>
						</n-gi>
					</n-grid>
					
					<n-divider style="margin: 12px 0"/>
					
					<n-space>
						<n-button size="small" @click="router.go(-1)">
							<template #icon>
								<NIcon :component="ArrowBackOutline"/>
							</template>
							返回
						</n-button>
						<n-button size="small" secondary tag="a" :href="`https://www.luogu.com/article/${article.id}`"
						          target="_blank">
							<template #icon>
								<NIcon :component="ShareSocialOutline"/>
							</template>
							原站
						</n-button>
						<n-button size="small" secondary @click="handleCopy">
							<template #icon>
								<NIcon :component="CopyOutline"/>
							</template>
							源码
						</n-button>
						<n-button size="small" type="primary">
							<template #icon>
								<NIcon :component="SyncOutline"/>
							</template>
							更新
						</n-button>
						<n-button size="small" type="error" ghost @click="handleDelete">
							<template #icon>
								<NIcon :component="TrashOutline"/>
							</template>
							删除
						</n-button>
					</n-space>
				</Card>
			</div>
		</LoadingSkeleton>
		
		<div style="margin-top: 16px;">
			<LoadingSkeleton :loading="loading">
				<template #skeleton>
					<Card>
						<n-space vertical size="large">
							<n-space vertical>
								<n-skeleton text :repeat="2"/>
								<n-skeleton text style="width: 60%"/>
							</n-space>
							<n-skeleton height="120px" style="border-radius: 4px"/>
							<n-space vertical>
								<n-skeleton text :repeat="4"/>
							</n-space>
						</n-space>
					</Card>
				</template>
				
				<Card v-if="article">
					<MarkdownViewer :content="article.renderedContent"/>
				</Card>
			</LoadingSkeleton>
		</div>

		<div style="margin-top: 20px;">
			<LoadingSkeleton :loading="recLoading">
				<template #skeleton>
					<Card title="相关推荐">
						<div class="article-list">
							<div v-for="i in 3" :key="i" class="article-item">
								<n-skeleton text :repeat="2"/>
							</div>
						</div>
					</Card>
				</template>

				<Card title="相关推荐" v-if="recommended.length">
					<div class="article-list">
						<div v-for="it in recommended" :key="it.id" class="article-item">
							<Card :title="it.title" :icon="NewspaperOutline" class="clickable-card" @click="openArticle(it.id)">
								<template #title-extra>
									<n-tag
										v-if="it.reason === 'title'"
										:color="{ textColor: '#ff6200', color: 'rgba(255, 98, 0, 0.15)', borderColor: '#ff6200' }"
										size="small"
									>
										标题相关
									</n-tag>
									<n-tag
										v-else-if="it.reason === 'vector'"
										:color="{ textColor: '#00aaff', color: 'rgba(0, 170, 255, 0.15)', borderColor: '#00aaff' }"
										size="small"
									>
										相似文章
									</n-tag>
								</template>

								<div class="article-summary">
									{{ it.summary || '暂无预览...' }}
								</div>

								<n-divider style="margin: 12px 0"/>

								<div class="article-meta">
									<div class="left">
										<UserLink :user="it.author" show-avatar/>
										<n-tag
											:color="{
												textColor: getCategoryColor(it.category),
												backgroundColor: hexToRgba(getCategoryColor(it.category), 0.12),
												borderColor: getCategoryColor(it.category)
											}"
											size="small"
											style="margin-left: 8px;"
										>
											<template #icon>
												<n-icon :component="getCategoryIcon(it.category)"/>
											</template>
											{{ getCategoryLabel(it.category) }}
										</n-tag>
									</div>
									<div class="right">
										<n-button text size="small" type="primary" @click.stop="openArticle(it.id)">
											阅读全文
										</n-button>
									</div>
								</div>
							</Card>
						</div>
					</div>
				</Card>

				<Card v-else-if="!recLoading" title="相关推荐">
					<div style="padding:12px;color:#666">暂无相关推荐</div>
				</Card>
			</LoadingSkeleton>
		</div>
 	
 	</div>
 </template>

<style scoped>
.article-detail-page {
	padding-bottom: 40px;
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
</style>