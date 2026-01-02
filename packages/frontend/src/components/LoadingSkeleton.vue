<template>
    <template v-if="!loading">
        <slot />
    </template>

    <template v-else>
        <slot name="skeleton" v-if="$slots.skeleton" />

        <n-space vertical v-else>
            <n-skeleton text :repeat="2" />
            <n-skeleton text style="width: 60%" />
        </n-space>
    </template>
</template>

<script setup lang="ts">
import { useSlots } from 'vue';
import { NSkeleton, NSpace } from 'naive-ui';

defineProps({
    loading: {
        type: Boolean,
        required: true,
        default: true
    }
});

const $slots = useSlots();
</script>
