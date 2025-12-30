<script setup lang="ts">
import { inject, ref } from 'vue';
import { useRouter } from 'vue-router';
import { NIcon, NInput, NButton } from 'naive-ui';
import { Search, ArrowForward } from '@vicons/ionicons5';
import { uiThemeKey } from '@/styles/theme/themeKeys.ts';
import LuoguLogo from '@/components/icons/LuoguLogo.vue';

const router = useRouter();
const themeVars = inject(uiThemeKey)!;
const searchText = ref('');

const handleSearch = () => {
    const query = searchText.value.trim();
    if (!query) return;

    if (query.match(/^https?:\/\//) || query.includes('luogu')) {
        // Link handling
        console.log('Link detected:', query);
    } else if (/^\d+$/.test(query)) {
        // UID handling
        console.log('UID detected:', query);
    } else {
        // Keyword handling
        console.log('Keyword detected:', query);
    }
};
</script>

<template>
    <div class="hero-section">
        <div class="hero-content">
            <div class="brand-header">
                <div class="logo-container">
                    <n-icon size="56" :color="themeVars.primaryColor" :component="LuoguLogo" />
                </div>
                <h1 class="hero-title">
                    <span class="title-accent">洛谷</span>保存站
                </h1>
            </div>
            <p class="hero-subtitle">Save everything, keep it alive.</p>

            <div class="hero-search">
                <n-input
                    class="mac-search-input"
                    size="large"
                    placeholder="输入链接、文章标题、关键词或 UID 查看..."
                    v-model:value="searchText"
                    @keydown.enter="handleSearch"
                >
                    <template #prefix>
                        <n-icon :component="Search" class="search-icon" />
                    </template>
                    <template #suffix>
                        <n-button
                            circle
                            type="primary"
                            @click="handleSearch"
                            class="search-button"
                            :style="{ background: themeVars.primaryColor }"
                        >
                            <template #icon>
                                <n-icon :component="ArrowForward" />
                            </template>
                        </n-button>
                    </template>
                </n-input>
            </div>

            <div class="quick-actions">
                <span class="quick-label">快速访问：</span>
                <a href="/plaza" class="quick-link">文章广场</a>
                <span class="quick-divider">·</span>
                <a href="/search" class="quick-link">高级搜索</a>
                <span class="quick-divider">·</span>
                <a href="/problem" class="quick-link">题目列表</a>
            </div>
        </div>
    </div>
</template>

<style scoped>
.hero-section {
    text-align: center;
    padding: 60px 20px 40px;
    position: relative;
}

.hero-content {
    max-width: 720px;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    align-items: center;
}

.brand-header {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 16px;
    margin-bottom: 12px;
}

.logo-container {
    display: flex;
    align-items: center;
    justify-content: center;
    filter: drop-shadow(0 4px 12px rgba(0, 122, 255, 0.2));
}

.hero-title {
    font-size: 52px;
    font-weight: 700;
    margin: 0;
    line-height: 1.1;
    letter-spacing: -0.03em;
    color: #1d1d1f;
    font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", "Helvetica Neue", sans-serif;
}

.title-accent {
    background: linear-gradient(135deg, #007AFF 0%, #5AC8FA 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
}

.hero-subtitle {
    font-size: 20px;
    color: #86868b;
    margin: 0 0 40px;
    font-weight: 400;
    letter-spacing: 0.01em;
}

.hero-search {
    width: 100%;
    max-width: 580px;
}

/* macOS Spotlight-style Search Input */
:deep(.mac-search-input) {
    background: rgba(255, 255, 255, 0.8) !important;
    backdrop-filter: blur(20px) saturate(180%);
    -webkit-backdrop-filter: blur(20px) saturate(180%);
    border: 1px solid rgba(0, 0, 0, 0.08) !important;
    border-radius: 14px !important;
    box-shadow:
        0 0 0 1px rgba(255, 255, 255, 0.5) inset,
        0 4px 24px rgba(0, 0, 0, 0.08),
        0 1px 3px rgba(0, 0, 0, 0.04);
    height: 56px;
    font-size: 16px;
    transition: all 0.25s cubic-bezier(0.25, 0.1, 0.25, 1);
}

:deep(.mac-search-input:hover) {
    background: rgba(255, 255, 255, 0.9) !important;
    box-shadow:
        0 0 0 1px rgba(255, 255, 255, 0.6) inset,
        0 8px 32px rgba(0, 0, 0, 0.12),
        0 2px 4px rgba(0, 0, 0, 0.04);
    transform: translateY(-1px);
}

:deep(.mac-search-input.n-input--focus) {
    background: #fff !important;
    border-color: rgba(0, 122, 255, 0.4) !important;
    box-shadow:
        0 0 0 4px rgba(0, 122, 255, 0.1),
        0 12px 40px rgba(0, 0, 0, 0.15);
    transform: translateY(-2px);
}

:deep(.n-input__input-el) {
    height: 100% !important;
    padding-left: 8px;
    font-weight: 400;
}

:deep(.n-input__input-el::placeholder) {
    color: #aeaeb2;
}

:deep(.search-icon) {
    opacity: 0.4;
    margin-left: 8px;
    font-size: 18px;
}

.search-button {
    width: 36px !important;
    height: 36px !important;
    border: none !important;
    box-shadow: 0 2px 8px rgba(0, 122, 255, 0.3);
}

.search-button:hover {
    transform: scale(1.05);
    box-shadow: 0 4px 12px rgba(0, 122, 255, 0.4);
}

.quick-actions {
    margin-top: 24px;
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 13px;
}

.quick-label {
    color: #aeaeb2;
}

.quick-link {
    color: #007AFF;
    text-decoration: none;
    font-weight: 500;
    transition: opacity 0.2s;
}

.quick-link:hover {
    opacity: 0.7;
}

.quick-divider {
    color: #d1d1d6;
}
</style>
