<script setup lang="ts">
import { ref, onMounted, inject } from 'vue';
import { useRouter } from 'vue-router';
import {
	NGrid, NGi, NIcon, NStatistic, NDivider
} from 'naive-ui';
import {
	Newspaper, Clipboard, Megaphone
} from '@vicons/ionicons5';
import { getArticleCount } from "@/api/article.ts";
import { getPasteCount } from "@/api/paste.ts";
import ThemeEditor from '@/components/ThemeEditor.vue';
import HomeHero from '@/components/HomeHero.vue';
import Card from '@/components/Card.vue';
import { uiThemeKey } from '@/styles/theme/themeKeys.ts';

const router = useRouter();
const articleCount = ref(0);
const pasteCount = ref(0);

const themeVars = inject(uiThemeKey)!;

onMounted(async () => {
	getArticleCount().then(res => articleCount.value = res.data.count);
	getPasteCount().then(res => pasteCount.value = res.data.count);
});
</script>

<template>
	<div class="home-container">
		<HomeHero />

		<div class="main-content">
			<n-grid :x-gap="20" :y-gap="20" cols="1 m:2 l:3" responsive="screen">
				<n-gi span="1 m:2 l:2">
					<Card :icon="Megaphone" title="公告" style="height: 100%" :hoverable="true">
						<div class="announcement-content">
							<p class="announcement-text">欢迎使用洛谷保存站！我们致力于保存和归档洛谷社区的优质内容。</p>
							<div class="announcement-tags">
								<span class="tag">新功能</span>
								<span class="tag-text">支持文章版本历史查看</span>
							</div>
						</div>
					</Card>
				</n-gi>

				<n-gi>
					<Card style="height: 100%" :hoverable="true">
						<div class="stats-container">
							<div class="stat-item">
								<div class="stat-icon-wrapper" :style="{ background: `linear-gradient(135deg, ${themeVars.primaryColor}20 0%, ${themeVars.primaryColor}10 100%)` }">
									<n-icon size="22" :component="Newspaper" :color="themeVars.primaryColor" />
								</div>
								<div class="stat-info">
									<n-statistic :value="articleCount">
										<template #label>
											<span class="stat-label">文章总数</span>
										</template>
									</n-statistic>
								</div>
							</div>
							<div class="stat-divider"></div>
							<div class="stat-item">
								<div class="stat-icon-wrapper" :style="{ background: `linear-gradient(135deg, ${themeVars.primaryColor}20 0%, ${themeVars.primaryColor}10 100%)` }">
									<n-icon size="22" :component="Clipboard" :color="themeVars.primaryColor" />
								</div>
								<div class="stat-info">
									<n-statistic :value="pasteCount">
										<template #label>
											<span class="stat-label">剪贴板总数</span>
										</template>
									</n-statistic>
								</div>
							</div>
						</div>
					</Card>
				</n-gi>
			</n-grid>
		</div>

		<ThemeEditor />
	</div>
</template>

<style scoped>
.home-container {
	min-height: 80vh;
	display: flex;
	flex-direction: column;
	gap: 24px;
}

.main-content {
	max-width: 1200px;
	margin: 0 auto;
	width: 100%;
}

.announcement-content {
	font-size: 15px;
	line-height: 1.7;
	color: #3d3d3d;
}

.announcement-text {
	margin: 0 0 16px;
}

.announcement-tags {
	display: flex;
	align-items: center;
	gap: 10px;
}

.tag {
	background: linear-gradient(135deg, #007AFF 0%, #5AC8FA 100%);
	color: #fff;
	font-size: 11px;
	font-weight: 600;
	padding: 4px 10px;
	border-radius: 6px;
	text-transform: uppercase;
	letter-spacing: 0.5px;
}

.tag-text {
	color: #86868b;
	font-size: 13px;
}

.stats-container {
	height: 100%;
	display: flex;
	flex-direction: column;
	justify-content: center;
	gap: 4px;
}

.stat-item {
	display: flex;
	align-items: center;
	gap: 16px;
	padding: 12px 0;
}

.stat-icon-wrapper {
	width: 44px;
	height: 44px;
	border-radius: 12px;
	display: flex;
	align-items: center;
	justify-content: center;
	flex-shrink: 0;
}

.stat-info {
	flex: 1;
}

.stat-label {
	font-size: 12px;
	color: #86868b;
	font-weight: 500;
}

.stat-divider {
	height: 1px;
	background: rgba(0, 0, 0, 0.06);
	margin: 4px 0;
}

:deep(.n-statistic .n-statistic-value) {
	font-size: 28px !important;
	font-weight: 600 !important;
	color: #1d1d1f !important;
	font-feature-settings: "tnum";
}
</style>
