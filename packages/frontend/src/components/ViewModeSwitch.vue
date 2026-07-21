<script setup lang="ts">
import { NButton, NIcon, NTooltip, useMessage } from 'naive-ui';
import { LayoutGrid, Star } from 'lucide-vue-next';
import { canUseFocusView, type ViewMode } from '@/composables/useViewMode';

defineProps<{
    modelValue: ViewMode;
}>();

const emit = defineEmits<{
    'update:modelValue': [value: ViewMode];
}>();

const message = useMessage();

const handleSwitch = (mode: ViewMode) => {
    if (mode === 'focus' && !canUseFocusView(window.innerWidth)) {
        message.warning('屏幕尺寸过小');
        return;
    }
    emit('update:modelValue', mode);
};
</script>

<template>
    <div class="view-mode-switch">
        <n-tooltip>
            <template #trigger>
                <n-button
                    size="small"
                    :type="modelValue === 'default' ? 'primary' : 'default'"
                    :ghost="modelValue !== 'default'"
                    class="view-mode-btn view-mode-btn--left"
                    @click="handleSwitch('default')"
                >
                    <template #icon>
                        <NIcon :component="LayoutGrid" />
                    </template>
                    综合
                </n-button>
            </template>
            默认视图，内容显示区域较窄
        </n-tooltip>
        <n-tooltip>
            <template #trigger>
                <n-button
                    size="small"
                    :type="modelValue === 'focus' ? 'primary' : 'default'"
                    :ghost="modelValue !== 'focus'"
                    class="view-mode-btn view-mode-btn--right"
                    @click="handleSwitch('focus')"
                >
                    <template #icon>
                        <NIcon :component="Star" />
                    </template>
                    聚焦
                </n-button>
            </template>
            聚焦于文章内容，内容显示区域较宽，还可以使用段落收藏
        </n-tooltip>
    </div>
</template>

<style scoped>
.view-mode-switch {
    display: inline-flex;
}

.view-mode-btn--left {
    border-top-right-radius: 0 !important;
    border-bottom-right-radius: 0 !important;
    border-right: none !important;
}

.view-mode-btn--right {
    border-top-left-radius: 0 !important;
    border-bottom-left-radius: 0 !important;
}
</style>
