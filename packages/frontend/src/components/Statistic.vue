<script setup lang="ts">
import { type Component, inject, computed, type Ref } from 'vue';
import { NIcon, NStatistic } from 'naive-ui';
import { uiThemeKey, type UiThemeVars } from '@/styles/theme/themeKeys.ts';
import Card from './Card.vue';

const themeVars: Ref<UiThemeVars> = inject(uiThemeKey)!;

const props = defineProps({
    icon: {
        type: Object as () => Component,
        required: true
    },
    label: {
        type: String,
        required: true
    },
    value: {
        type: [String, Number],
        required: true
    },
    iconColor: {
        type: String,
        default: null
    }
});

const effectiveIconColor = computed(() => {
    return props.iconColor || themeVars.value.primaryColor;
});
</script>

<template>
    <Card style="text-align: center">
        <n-icon :component="icon" size="40" :color="effectiveIconColor" />

        <n-statistic :label="label" :value="value"> </n-statistic>
    </Card>
</template>

<style scoped>
.n-icon {
    margin-bottom: 16px;
}

:deep(.n-statistic-value__content) {
    font-size: 2.3rem !important;
    font-weight: 550;
}

:deep(.n-statistic__label) {
    font-size: 1.1rem;
    color: black;
}
</style>
