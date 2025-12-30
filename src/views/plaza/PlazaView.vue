<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import { NSpin, NDivider, NButton, NIcon, NEmpty, NTag } from 'naive-ui';
import { NewspaperOutline, ArrowForwardOutline, SparklesOutline, GlobeOutline } from '@vicons/ionicons5';
import { FireAlt } from '@vicons/fa';

import { getRecommendations } from '@/api/recommendation';
import type { PlazaArticle } from '@/types/article';

import Card from '@/components/Card.vue';
import CardTitle from '@/components/CardTitle.vue';
import UserLink from '@/components/UserLink.vue';
import { ARTICLE_CATEGORIES } from '@/utils/constants';
import { hexToRgba } from "@/utils/render.ts";

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
		const newArticles = await getRecommendations() || [];

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

	observer = new IntersectionObserver((entries) => {
		if (entries[0].isIntersecting && !loading.value) {
			loadMore();
		}
	}, {
		rootMargin: '200px',
		threshold: 0.1
	});

	if (loadTrigger.value) {
		observer.observe(loadTrigger.value);
	}
});

onUnmounted(() => {
	if (observer) observer.disconnect();
});

const getCategoryLabel = (id?: number) => {
	if (id && ARTICLE_CATEGORIES[id]) return ARTICLE_CATEGORIES[id].label;
	return ARTICLE_CATEGORIES[9].label;
};

const getCategoryColor = (id?: number) => {
	if (id && ARTICLE_CATEGORIES[id]) return ARTICLE_CATEGORIES[id].color;
	return ARTICLE_CATEGORIES[9].color;
}

const getCategoryIcon = (id?: number) => {
	if (id && ARTICLE_CATEGORIES[id]) return ARTICLE_CATEGORIES[id].icon;
	return ARTICLE_CATEGORIES[9].icon;
}

const goToDetail = (id: string) => {
	const route = router.resolve({ path: `/article/${id}` });
	const newWin = window.open(route.href, '_blank');
	if (newWin) newWin.opener = null;
};
</script>

<template>
	<CardTitle title="文章广场" :icon="GlobeOutline" class="feed-header">
		ARTICLE PLAZA!
	</CardTitle>
	
	<div class="article-list">
		<div
			v-for="article in articles"
			:key="article.id"
			class="article-item"
		>
			<Card
				:title="article.title"
				:icon="NewspaperOutline"
				class="clickable-card"
				@click="goToDetail(article.id)"
			>
				<template #title-extra>
					<n-tag
						v-if="article.reason === 'hot'"
						:color="{ textColor: '#ff6200', color: 'rgba(255, 98, 0, 0.2)', borderColor: '#ff6200' }"
						size="small"
					>
						<template #icon>
							<n-icon :component="FireAlt"/>
						</template>
						热门
					</n-tag>
					<n-tag
						v-else-if="article.reason === 'vector'"
						:color="{ textColor: '#00aaff', color: 'rgba(0, 170, 255, 0.2)', borderColor: '#00aaff' }"
						size="small"
					>
						<template #icon>
							<n-icon :component="SparklesOutline"/>
						</template>
						猜你想看
					</n-tag>
				</template>
				<div class="article-summary">
					{{ article.summary || '暂无预览...' }}...
				</div>
				
				<n-divider style="margin: 12px 0"/>
				
				<div class="article-meta">
					<div class="left">
						<UserLink :user="article.author" show-avatar/>
						<n-tag
							:color="{
									textColor: getCategoryColor(article.category),
									backgroundColor: hexToRgba(getCategoryColor(article.category), 0.2),
									borderColor: getCategoryColor(article.category)
								}"
							size="small"
							style="margin-left: 8px;"
						>
							<template #icon>
								<n-icon :component="getCategoryIcon(article.category)"/>
							</template>
							{{ getCategoryLabel(article.category) }}
						</n-tag>
					</div>
					<div class="right">
						<n-button text size="small" type="primary" @click.stop="goToDetail(article.id)">
							阅读全文
							<n-icon :component="ArrowForwardOutline" style="margin-left: 4px"/>
						</n-button>
					</div>
				</div>
			</Card>
		</div>
	</div>
	
	<div ref="loadTrigger" class="load-trigger">
		
		<div v-if="loading" class="loading-state">
			<n-spin size="small"/>
			<span style="margin-left: 8px; color: #999;">正在加载更多推荐...</span>
		</div>
		
		<div v-else-if="error" class="error-state">
			<span style="color: #d03050;">加载失败</span>
			<n-button size="small" @click="loadMore" style="margin-left: 10px;">重试</n-button>
		</div>
		
		<n-empty v-else-if="noMore && everReturned" description="没有更多推荐了（你是真能看啊）"/>
		<n-empty v-else-if="noMore && !everReturned" description="暂无推荐（你是真能看啊）"/>
	</div>
</template>

<style scoped>
.feed-header {
	margin-bottom: 24px;
}

.article-list {
	display: flex;
	flex-direction: column;
	gap: 16px;
}

.article-item {
	transition: transform 0.25s cubic-bezier(0.25, 0.1, 0.25, 1);
}

.clickable-card {
	cursor: pointer;
}

.article-summary {
	color: #48484a;
	font-size: 14px;
	line-height: 1.7;
	display: -webkit-box;
	-webkit-line-clamp: 3;
	-webkit-box-orient: vertical;
	overflow: hidden;
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

.load-trigger {
	padding: 32px 0;
	display: flex;
	justify-content: center;
	align-items: center;
	min-height: 60px;
}

.loading-state, .error-state {
	display: flex;
	align-items: center;
	color: #86868b;
	font-size: 14px;
}

.loading-state span {
	margin-left: 12px;
}

/* macOS-style divider */
:deep(.n-divider) {
	background-color: rgba(0, 0, 0, 0.06) !important;
}

/* Tag styling */
:deep(.n-tag) {
	border-radius: 6px !important;
	font-weight: 500 !important;
	font-size: 11px !important;
}

/* Empty state */
:deep(.n-empty) {
	padding: 24px 0;
}

:deep(.n-empty__description) {
	color: #86868b;
	font-size: 14px;
}

/* Primary button text styling */
:deep(.n-button--primary-type.n-button--text-type) {
	font-weight: 500;
}
</style>