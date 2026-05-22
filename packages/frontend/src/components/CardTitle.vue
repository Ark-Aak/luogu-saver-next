<script setup lang="ts">
import { computed, type Component, type CSSProperties, type Ref } from 'vue';
import { NIcon, NCard, NH1, NText } from 'naive-ui';
import { uiThemeKey, type UiThemeVars } from '@/styles/theme/themeKeys.ts';
import { inject } from 'vue';
import { hexToRgba } from '@/utils/render';

const themeVars: Ref<UiThemeVars> = inject(uiThemeKey)!;

const props = defineProps({
    title: {
        type: String,
        required: true
    },
    icon: {
        type: Object as () => Component,
        default: null
    },
    backgroundColor: {
        type: String,
        default: null
    },
    iconColor: {
        type: String,
        default: null
    },
    textColor: {
        type: String,
        default: null
    },
    chip: {
        type: String,
        default: 'LUOGU SAVER'
    }
});

const containerStyle = computed(
    (): CSSProperties => ({
        background:
            props.backgroundColor ||
            `linear-gradient(135deg, ${hexToRgba(themeVars.value.primaryColor, 0.16)} 0%, rgba(255, 255, 255, 0.92) 52%, ${hexToRgba(themeVars.value.primaryColorHover, 0.2)} 100%)`,
        color: '#10233f'
    })
);

const titleStyle = computed(
    (): CSSProperties => ({
        color: props.textColor || '#10233f',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'flex-start',
        gap: '12px'
    })
);

const effectiveIconColor = computed(() => {
    return props.iconColor || themeVars.value.primaryColor;
});
</script>

<template>
    <n-card :bordered="false" content-style="padding: 0;">
        <div class="title-banner" :style="containerStyle">
            <div class="banner-content">
                <div class="banner-main">
                    <div v-if="icon" class="icon-frame">
                        <n-icon
                            :component="icon"
                            :color="effectiveIconColor"
                            size="34"
                            :depth="1"
                        />
                    </div>
                    <div>
                        <n-h1 class="title">
                            <span :style="titleStyle">{{ title }}</span>
                        </n-h1>
                        <n-text class="subtitle">
                            <slot />
                        </n-text>
                    </div>
                </div>
                <div v-if="chip" class="banner-chip">{{ chip }}</div>
            </div>
        </div>
    </n-card>
</template>

<style scoped>
.title-banner {
    position: relative;
    overflow: hidden;
    padding: 24px 30px;
    border-radius: 6px;
    box-shadow: 0 12px 26px rgba(47, 109, 181, 0.08);
    border: 1px solid rgba(47, 109, 181, 0.1);
}

.banner-content {
    position: relative;
    z-index: 1;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 20px;
}

.banner-main {
    display: flex;
    align-items: center;
    gap: 16px;
}

.icon-frame {
    width: 48px;
    height: 48px;
    border-radius: 6px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(47, 109, 181, 0.08);
    border: 1px solid rgba(47, 109, 181, 0.13);
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.7);
}

.title {
    margin: 0 0 4px;
    font-weight: bold;
}

:deep(.title .n-h1) {
    color: #10233f;
}

.subtitle {
    color: #5f7188 !important;
    font-size: 1rem;
    letter-spacing: 0.08em;
}

.banner-chip {
    padding: 8px 12px;
    border-radius: 6px;
    color: #2f6db5;
    border: 1px solid rgba(47, 109, 181, 0.14);
    background: rgba(47, 109, 181, 0.07);
    font-size: 12px;
    letter-spacing: 0.12em;
    white-space: nowrap;
}

@media (max-width: 720px) {
    .title-banner {
        padding: 22px;
        border-radius: 6px;
    }

    .banner-content {
        align-items: flex-start;
        flex-direction: column;
    }

    .banner-chip {
        display: none;
    }
}
</style>
