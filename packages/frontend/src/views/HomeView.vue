<script setup lang="ts">
import { ref, onMounted, inject } from 'vue';
import { NEmpty, NGrid, NGi, NIcon, NStatistic, NDivider } from 'naive-ui';
import { Newspaper, Clipboard, Megaphone } from '@vicons/ionicons5';
import { getArticleCount } from '@/api/article.ts';
import { getPasteCount } from '@/api/paste.ts';
import { getCurrentAnnouncement, type Announcement } from '@/api/announcement.ts';
import ThemeEditor from '@/components/ThemeEditor.vue';
import HomeHero from '@/components/HomeHero.vue';
import Card from '@/components/Card.vue';
import { uiThemeKey } from '@/styles/theme/themeKeys.ts';

const articleCount = ref(0);
const pasteCount = ref(0);
const announcement = ref<Announcement | null>(null);
// const saveUrl = ref('');

const themeVars = inject(uiThemeKey)!;

onMounted(async () => {
    getArticleCount().then(res => (articleCount.value = res.data.count));
    getPasteCount().then(res => (pasteCount.value = res.data.count));
    getCurrentAnnouncement().then(res => (announcement.value = res.data));
});

/*
const handleSave = () => {
	if (saveUrl.value) {
		// TODO: Implement save
		console.log('Save:', saveUrl.value);
	}
};
 */
</script>

<template>
    <div class="home-container">
        <HomeHero />

        <div class="main-content">
            <n-grid :x-gap="20" :y-gap="20" cols="1 m:2 l:3" responsive="screen">
                <n-gi span="1 m:1 l:2">
                    <Card :title="announcement?.title || '公告'" class="home-card">
                        <template #header-extra>
                            <n-icon
                                size="20"
                                :component="Megaphone"
                                :color="themeVars.primaryColor"
                            />
                        </template>
                        <div
                            v-if="announcement"
                            class="announcement-content"
                            v-html="announcement.content"
                        ></div>
                        <n-empty v-else description="暂无公告" />
                    </Card>
                </n-gi>

                <n-gi>
                    <Card class="home-card stat-card">
                        <div class="stats-container">
                            <div class="stat-item">
                                <div
                                    class="stat-icon-wrapper"
                                    :style="{
                                        backgroundColor:
                                            'color-mix(in srgb, ' +
                                            themeVars.primaryColor +
                                            ' 12%, transparent)'
                                    }"
                                >
                                    <n-icon
                                        size="24"
                                        :component="Newspaper"
                                        :color="themeVars.primaryColor"
                                    />
                                </div>
                                <n-statistic label="文章总数" :value="articleCount" />
                            </div>
                            <n-divider style="margin: 0" />
                            <div class="stat-item">
                                <div
                                    class="stat-icon-wrapper"
                                    :style="{
                                        backgroundColor:
                                            'color-mix(in srgb, ' +
                                            themeVars.primaryColor +
                                            ' 12%, transparent)'
                                    }"
                                >
                                    <n-icon
                                        size="24"
                                        :component="Clipboard"
                                        :color="themeVars.primaryColor"
                                    />
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
    display: flex;
    flex-direction: column;
    gap: 22px;
}

.main-content {
    max-width: 1220px;
    margin: 0 auto;
    width: 100%;
}

.home-card {
    min-height: 190px;
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
    border-radius: var(--ui-card-radius);
    display: flex;
    align-items: center;
    justify-content: center;
}

.announcement-content {
    font-size: 16px;
    line-height: 1.8;
    color: var(--ui-secondary-text-color);
    padding: 6px 0 0;
}

.stats-container {
    height: 100%;
    display: flex;
    flex-direction: column;
    justify-content: space-around;
}

.stat-card :deep(.n-statistic-value__content) {
    color: var(--ui-card-title-color);
    font-weight: 700;
}
</style>
