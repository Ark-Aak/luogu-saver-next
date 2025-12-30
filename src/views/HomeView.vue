<script setup lang="ts">
import { ref, onMounted, inject } from 'vue';
import { useRouter } from 'vue-router';
import {
	NGrid, NGi, NInput, NIcon, NButton, NStatistic, NDivider
} from 'naive-ui';
import {
	Link, Newspaper, Clipboard, Megaphone, Save
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
const saveUrl = ref('');

const themeVars = inject(uiThemeKey)!;

onMounted(async () => {
	getArticleCount().then(res => articleCount.value = res.data.count);
	getPasteCount().then(res => pasteCount.value = res.data.count);
});

const handleSave = () => {
	if (saveUrl.value) {
		// TODO: Implement save
		console.log('Save:', saveUrl.value);
	}
};
</script>

<template>
	<div class="home-container">
		<HomeHero />

		<div class="main-content">
			<n-grid :x-gap="24" :y-gap="24" cols="1 m:2 l:3" responsive="screen">
				<n-gi span="1 m:2 l:2">
					<Card title="公告" style="height: 100%" :hoverable="true">
						<template #header-extra>
							<n-icon size="20" :component="Megaphone" :color="themeVars.primaryColor" />
						</template>
						<div class="announcement-content">
							This is a sample announcement text.
						</div>
					</Card>
				</n-gi>

				<n-gi>
					 <Card style="height: 100%" :hoverable="true">
						 <div class="stats-container">
							 <div class="stat-item">
								 <div class="stat-icon-wrapper" :style="{ backgroundColor: themeVars.primaryColor + '20' }">
									 <n-icon size="24" :component="Newspaper" :color="themeVars.primaryColor" />
								 </div>
								 <n-statistic label="文章总数" :value="articleCount" />
							 </div>
							 <n-divider style="margin: 0" />
							 <div class="stat-item">
								 <div class="stat-icon-wrapper" :style="{ backgroundColor: themeVars.primaryColor + '20' }">
									 <n-icon size="24" :component="Clipboard" :color="themeVars.primaryColor" />
								 </div>
								 <n-statistic label="剪贴板总数" :value="pasteCount" />
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
	gap: 40px;
}

.main-content {
	max-width: 1200px;
	margin: 0 auto;
	width: 100%;
}

.stat-item {
	display: flex;
	align-items: center;
	gap: 16px;
	padding: 8px 0;
}

.stat-icon-wrapper {
	width: 48px;
	height: 48px;
	border-radius: 12px;
	display: flex;
	align-items: center;
	justify-content: center;
}

.announcement-content {
	font-size: 16px;
	line-height: 1.6;
	color: #444;
}

.stats-container {
	height: 100%;
	display: flex;
	flex-direction: column;
	justify-content: space-around;
}
</style>
