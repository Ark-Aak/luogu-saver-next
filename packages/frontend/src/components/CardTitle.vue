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
            `linear-gradient(135deg, ${hexToRgba(themeVars.value.primaryColor, 0.16)} 0%, ${themeVars.value.translucentCardColor} 52%, ${hexToRgba(themeVars.value.primaryColorHover, 0.2)} 100%)`,
        color: themeVars.value.cardTitleColor
    })
);

const titleStyle = computed(
    (): CSSProperties => ({
        color: props.textColor || themeVars.value.cardTitleColor,
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
    border-radius: var(--ui-card-radius);
    box-shadow: var(--ui-card-shadow);
    border: 1px solid var(--ui-border-color);
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
    border-radius: var(--ui-card-radius);
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--ui-panel-color);
    border: 1px solid var(--ui-border-color);
    box-shadow: inset 0 1px 0 var(--ui-translucent-card-color);
}

.title {
    margin: 0 0 4px;
    font-weight: bold;
}

:deep(.title .n-h1) {
    color: var(--ui-card-title-color);
}

.subtitle {
    color: var(--ui-muted-text-color) !important;
    font-size: 1rem;
    letter-spacing: 0.08em;
}

.banner-chip {
    padding: 8px 12px;
    border-radius: var(--ui-card-radius);
    color: var(--ui-primary-color);
    border: 1px solid var(--ui-border-color);
    background: var(--ui-panel-color);
    font-size: 12px;
    letter-spacing: 0.12em;
    white-space: nowrap;
}

@media (max-width: 720px) {
    .title-banner {
        padding: 22px;
        border-radius: var(--ui-card-radius);
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
