<script setup lang="ts">
import { inject, ref } from 'vue';
import { useRouter } from 'vue-router';
import { NIcon, NInput, NButton } from 'naive-ui';
import { Search, ArrowForward } from '@vicons/ionicons5';
import { uiThemeKey } from '@/styles/theme/themeKeys.ts';
import LuoguLogo from '@/components/icons/LuoguLogo.vue';

const themeVars = inject(uiThemeKey)!;
const searchText = ref('');
const router = useRouter();

const handleSearch = () => {
    const query = searchText.value.trim();
    if (!query) return;

    const articleMatch = query.match(/luogu\.com(?:\.cn)?\/article\/([A-Za-z0-9]+)/);
    if (articleMatch?.[1]) {
        router.push(`/article/${articleMatch[1]}`);
        return;
    }

    const articleIdMatch = query.match(/^([A-Za-z0-9]{8})$/);
    if (articleIdMatch?.[1]) {
        router.push(`/article/${articleIdMatch[1]}`);
        return;
    }

    router.push({ path: '/search', query: { q: query } });
};
</script>

<template>
    <div class="hero-section">
        <div class="hero-content">
            <div class="hero-copy">
                <div class="hero-eyebrow">ARCHIVE / SEARCH / RESTORE</div>
                <div class="brand-header">
                    <div class="logo-placeholder">
                        <n-icon size="42" :color="themeVars.primaryColor" :component="LuoguLogo" />
                    </div>
                    <h1 class="hero-title">
                        <span :style="{ color: themeVars.primaryColor }">洛谷</span>保存站
                    </h1>
                </div>
                <p class="hero-subtitle">Save everything, keep it alive.</p>
                <!--
                <p class="hero-description">
                
                </p>
                -->

                <div class="hero-search">
                    <n-input
                        v-model:value="searchText"
                        class="mac-input"
                        size="large"
                        placeholder="&nbsp;&nbsp;&nbsp输入链接、文章标题、文章 ID、关键词或作者用户名查看"
                        @keydown.enter="handleSearch"
                    >
                        <template #prefix>
                            <n-icon :component="Search" class="search-icon" />
                        </template>
                        <template #suffix>
                            <n-button
                                circle
                                type="primary"
                                class="search-button"
                                @click="handleSearch"
                            >
                                <template #icon>
                                    <n-icon :component="ArrowForward" />
                                </template>
                            </n-button>
                        </template>
                    </n-input>
                </div>
            </div>
            <div class="hero-panel">
                <div class="panel-card">
                    <span class="panel-label">INDEX</span>
                    <strong>保存入口</strong>
                </div>
                <div class="panel-card">
                    <span class="panel-label">FEED</span>
                    <strong>文章推荐</strong>
                </div>
                <div class="panel-card">
                    <span class="panel-label">VIEW</span>
                    <strong>内容渲染</strong>
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped>
.hero-section {
    width: 100%;
    max-width: 1220px;
    margin: 0 auto;
    box-sizing: border-box;
    padding: 48px;
    position: relative;
    overflow: hidden;
    border-radius: var(--ui-card-radius);
    background: linear-gradient(135deg, var(--ui-card-color), var(--ui-body-gradient-end));
    border: 1px solid var(--ui-border-color);
    box-shadow: var(--ui-card-shadow);
}

.hero-content {
    position: relative;
    z-index: 1;
    margin: 0 auto;
    display: grid;
    grid-template-columns: minmax(0, 1fr) 320px;
    align-items: center;
    gap: 32px;
}

.hero-copy {
    width: 100%;
}

.hero-eyebrow {
    display: inline-flex;
    padding: 7px 12px;
    margin-bottom: 18px;
    border-radius: var(--ui-card-radius);
    color: var(--ui-primary-color);
    background: var(--ui-panel-color);
    border: 1px solid var(--ui-border-color);
    font-size: 12px;
    font-weight: 700;
    letter-spacing: 0.14em;
}

.brand-header {
    display: flex;
    align-items: center;
    gap: 16px;
    margin-bottom: 12px;
}

.logo-placeholder {
    width: 62px;
    height: 62px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: var(--ui-card-radius);
    background: var(--ui-translucent-card-color);
    box-shadow: none;
    border: 1px solid var(--ui-border-color);
}

.hero-title {
    font-size: clamp(40px, 5vw, 60px);
    font-weight: 700;
    margin: 0;
    line-height: 1.1;
    letter-spacing: -0.02em;
    font-family:
        -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
}

.hero-subtitle {
    font-size: 24px;
    color: var(--ui-secondary-text-color);
    margin: 0 0 12px;
    font-weight: 600;
    letter-spacing: 0.01em;
}

.hero-description {
    max-width: 650px;
    margin: 0 0 34px;
    color: var(--ui-muted-text-color);
    font-size: 16px;
    line-height: 1.8;
}

.hero-search {
    width: 100%;
    max-width: 700px;
}

/* macOS Style Input */
:deep(.mac-input) {
    background-color: var(--ui-translucent-card-color) !important;
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    border: 1px solid var(--ui-border-color) !important;
    border-radius: var(--ui-card-radius) !important;
    box-shadow: var(--ui-card-shadow);
    height: 58px;
    font-size: 18px;
    transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
}

:deep(.mac-input:hover) {
    background-color: var(--ui-translucent-card-color) !important;
    box-shadow: var(--ui-card-shadow);
}

:deep(.mac-input.n-input--focus) {
    background-color: var(--ui-card-color) !important;
    box-shadow: var(--ui-card-shadow);
}

:deep(.n-input__input-el) {
    height: 100% !important;
    padding-left: 8px;
}

:deep(.search-icon) {
    opacity: 0.5;
    margin-left: 8px;
}

.search-button {
    width: 40px;
    height: 40px;
}

.hero-panel {
    width: 100%;
    display: grid;
    gap: 12px;
}

.panel-card {
    padding: 16px;
    border-radius: var(--ui-card-radius);
    background: var(--ui-translucent-card-color);
    border: 1px solid var(--ui-border-color);
}

.panel-card strong {
    display: block;
    margin-top: 8px;
    color: var(--ui-card-title-color);
    font-size: 16px;
}

.panel-label {
    color: var(--ui-primary-color);
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.12em;
}

@media (max-width: 980px) {
    .hero-section {
        padding: 40px 28px;
    }

    .hero-content {
        grid-template-columns: 1fr;
    }

    .hero-panel {
        grid-template-columns: repeat(3, 1fr);
    }
}

@media (max-width: 640px) {
    .hero-section {
        padding: 30px 18px;
        border-radius: var(--ui-card-radius);
    }

    .brand-header {
        align-items: flex-start;
        flex-direction: column;
    }

    .hero-panel {
        grid-template-columns: 1fr;
    }
}
</style>
