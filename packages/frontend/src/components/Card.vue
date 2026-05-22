<script setup lang="ts">
import { type CSSProperties, inject, computed, type Component, useSlots, type Ref } from 'vue';
import { NIcon } from 'naive-ui';
import { uiThemeKey, type UiThemeVars } from '@/styles/theme/themeKeys.ts';

const themeVars: Ref<UiThemeVars> = inject(uiThemeKey)!;
const slots = useSlots();

const props = defineProps({
    title: {
        type: String,
        default: null
    },
    icon: {
        type: Object as () => Component,
        default: null
    },
    iconColor: {
        type: String,
        default: null
    },
    backgroundColor: {
        type: String,
        default: null
    },
    hoverable: {
        type: Boolean,
        default: false
    },
    titleHtml: {
        type: String,
        default: null
    }
});

const emit = defineEmits<{
    click: [event: MouseEvent];
}>();

const effectiveIconColor = computed(() => {
    return props.iconColor || themeVars.value.primaryColor;
});

const effectiveBackgroundColor = computed(() => {
    return props.backgroundColor || themeVars.value.cardColor;
});

const cardStyle = computed(
    (): CSSProperties => ({
        backgroundColor: effectiveBackgroundColor.value,
        boxShadow: themeVars.value.cardShadow,
        borderRadius: themeVars.value.cardRadius
    })
);

const showHeader = computed(() => {
    return !!props.title || !!props.titleHtml || !!slots['header-extra'];
});
</script>

<template>
    <div
        class="saver-card"
        :class="{ 'is-hoverable': hoverable }"
        :style="cardStyle"
        @click="event => emit('click', event)"
    >
        <div v-if="showHeader" class="card-header">
            <div class="card-title-wrapper">
                <n-icon
                    v-if="icon"
                    :component="icon"
                    :color="effectiveIconColor"
                    size="24"
                    :depth="1"
                />
                <span
                    v-if="titleHtml"
                    class="card-title"
                    :style="{ color: themeVars.cardTitleColor }"
                    v-html="titleHtml"
                />
                <span
                    v-else-if="title"
                    class="card-title"
                    :style="{ color: themeVars.cardTitleColor }"
                >
                    {{ title }}
                </span>
                <slot name="title-extra" />
            </div>
            <div class="card-extra">
                <slot name="header-extra" />
            </div>
        </div>
        <div class="card-content">
            <slot />
        </div>
    </div>
</template>

<style scoped>
.saver-card {
    padding: 20px;
    border: 1px solid rgba(47, 109, 181, 0.08);
    transition:
        transform 0.3s ease,
        box-shadow 0.3s ease,
        border-color 0.3s ease;
    display: flex;
    flex-direction: column;
}

.saver-card.is-hoverable:hover {
    transform: translateY(-2px);
    border-color: rgba(47, 109, 181, 0.16);
    box-shadow: 0 14px 28px rgba(47, 109, 181, 0.1) !important;
}

.card-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 14px;
}

.card-title-wrapper {
    display: flex;
    align-items: center;
    gap: 10px;
}

.card-title-wrapper > .n-icon {
    width: 34px;
    height: 34px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: 6px;
    background: rgba(47, 109, 181, 0.08);
}

.card-title {
    font-weight: bold;
    font-size: 18px;
    line-height: 1.25;
}

.card-content {
    flex: 1;
}

:deep(mark) {
    padding: 0 2px;
    border-radius: 3px;
    background: rgba(47, 109, 181, 0.14);
    color: inherit;
}
</style>
