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
                <p class="hero-description">
                    面向洛谷内容的保存、检索与推荐入口。保留熟悉的轻量风格，升级为更清晰的极客蓝信息台。
                </p>

                <div class="hero-search">
                    <n-input
                        v-model:value="searchText"
                        class="mac-input"
                        size="large"
                        placeholder="输入链接/文章标题或关键词/uid 查看"
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
    border-radius: 6px;
    background: linear-gradient(135deg, rgba(255, 255, 255, 0.96), rgba(240, 246, 252, 0.92));
    border: 1px solid rgba(47, 109, 181, 0.1);
    box-shadow: 0 14px 32px rgba(47, 109, 181, 0.07);
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
    border-radius: 6px;
    color: #2f6db5;
    background: rgba(47, 109, 181, 0.08);
    border: 1px solid rgba(47, 109, 181, 0.12);
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
    border-radius: 6px;
    background: rgba(255, 255, 255, 0.86);
    box-shadow: none;
    border: 1px solid rgba(47, 109, 181, 0.1);
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
    color: #3d5a80;
    margin: 0 0 12px;
    font-weight: 600;
    letter-spacing: 0.01em;
}

.hero-description {
    max-width: 650px;
    margin: 0 0 34px;
    color: #64748b;
    font-size: 16px;
    line-height: 1.8;
}

.hero-search {
    width: 100%;
    max-width: 700px;
}

/* macOS Style Input */
:deep(.mac-input) {
    background-color: rgba(255, 255, 255, 0.78) !important;
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    border: 1px solid rgba(22, 119, 255, 0.14) !important;
    border-radius: 6px !important;
    box-shadow: 0 10px 24px rgba(47, 109, 181, 0.08);
    height: 58px;
    font-size: 18px;
    transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
}

:deep(.mac-input:hover) {
    background-color: rgba(255, 255, 255, 0.8) !important;
    box-shadow: 0 12px 28px rgba(47, 109, 181, 0.1);
}

:deep(.mac-input.n-input--focus) {
    background-color: #fff !important;
    box-shadow: 0 14px 32px rgba(47, 109, 181, 0.12);
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
    border-radius: 6px;
    background: rgba(255, 255, 255, 0.72);
    border: 1px solid rgba(47, 109, 181, 0.1);
}

.panel-card strong {
    display: block;
    margin-top: 8px;
    color: #10233f;
    font-size: 16px;
}

.panel-label {
    color: #2f6db5;
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
        border-radius: 6px;
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
