<script setup lang="ts">
import { inject, ref } from 'vue';
import { NIcon, NInput, NButton } from 'naive-ui';
import { Search, ArrowForward } from '@vicons/ionicons5';
import { uiThemeKey } from '@/styles/theme/themeKeys.ts';
import LuoguLogo from '@/components/icons/LuoguLogo.vue';

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
                <div class="logo-placeholder">
                    <n-icon size="48" :color="themeVars.primaryColor" :component="LuoguLogo" />
                </div>
                <h1 class="hero-title">
                    <span :style="{ color: themeVars.primaryColor }">洛谷</span>保存站
                </h1>
            </div>
            <p class="hero-subtitle">Save everything, keep it alive.</p>
            
            <div class="hero-search">
                <n-input
                    class="mac-input"
                    size="large"
                    placeholder="输入链接/文章标题或关键词/uid 查看"
                    v-model:value="searchText"
                    @keydown.enter="handleSearch"
                >
                    <template #prefix>
                        <n-icon :component="Search" class="search-icon" />
                    </template>
                    <template #suffix>
                        <n-button circle type="primary" @click="handleSearch" class="search-button">
                            <template #icon>
                                <n-icon :component="ArrowForward" />
                            </template>
                        </n-button>
                    </template>
                </n-input>
            </div>
        </div>
    </div>
</template>

<style scoped>
.hero-section {
    text-align: center;
    padding: 80px 20px;
    position: relative;
}

.hero-content {
    max-width: 800px;
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
    margin-bottom: 16px;
}

.logo-placeholder {
    display: flex;
    align-items: center;
    justify-content: center;
}

.hero-title {
    font-size: 56px;
    font-weight: 700;
    margin: 0;
    line-height: 1.1;
    letter-spacing: -0.02em;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
}

.hero-subtitle {
    font-size: 24px;
    color: #86868b;
    margin: 0 0 50px;
    font-weight: 400;
    letter-spacing: 0.01em;
}

.hero-search {
    width: 100%;
    max-width: 640px;
}

/* macOS Style Input */
:deep(.mac-input) {
    background-color: rgba(255, 255, 255, 0.65) !important;
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    border: 1px solid rgba(0, 0, 0, 0.05) !important;
    border-radius: 20px !important;
    box-shadow: 0 8px 40px rgba(0, 0, 0, 0.08);
    height: 64px;
    font-size: 18px;
    transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
}

:deep(.mac-input:hover) {
    background-color: rgba(255, 255, 255, 0.8) !important;
    box-shadow: 0 12px 48px rgba(0, 0, 0, 0.12);
    transform: translateY(-1px);
}

:deep(.mac-input.n-input--focus) {
    background-color: #fff !important;
    box-shadow: 0 16px 60px rgba(0, 0, 0, 0.15);
    transform: translateY(-2px);
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
</style>
