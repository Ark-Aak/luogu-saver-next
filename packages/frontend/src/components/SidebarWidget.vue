<script setup lang="ts">
import { type Component, inject, computed, type Ref } from 'vue';
import { NIcon } from 'naive-ui';
import { uiThemeKey, type UiThemeVars } from '@/styles/theme/themeKeys.ts';

const themeVars: Ref<UiThemeVars> = inject(uiThemeKey)!;

defineProps<{
    title?: string;
    icon?: Component;
}>();

const titleColor = computed(() => themeVars.value.cardTitleColor);
const iconColor = computed(() => themeVars.value.primaryColor);
</script>

<template>
    <div class="sidebar-widget">
        <div v-if="title" class="widget-header">
            <NIcon v-if="icon" :component="icon" :color="iconColor" class="widget-icon" />
            <span class="widget-title" :style="{ color: titleColor }">{{ title }}</span>
        </div>
        <div class="widget-content">
            <slot />
        </div>
    </div>
</template>

<style scoped>
.sidebar-widget {
    margin-bottom: 24px;
}

.widget-header {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 16px;
    padding-bottom: 8px;
    border-bottom: 1px solid rgba(0, 0, 0, 0.06);
}

.widget-icon {
    font-size: 18px;
}

.widget-title {
    font-size: 15px;
    font-weight: 600;
    letter-spacing: 0.5px;
}

.widget-content {
    padding: 0 4px;
}
</style>
