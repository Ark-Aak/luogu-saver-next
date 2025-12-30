<script setup lang="ts">
import { type Component, inject, computed } from 'vue';
import { NIcon } from 'naive-ui';
import { uiThemeKey, type UiThemeVars } from '@/styles/theme/themeKeys.ts';

const themeVars: UiThemeVars = inject(uiThemeKey)!;

defineProps<{
	title?: string;
	icon?: Component;
}>();

const iconColor = computed(() => themeVars.value.primaryColor);
</script>

<template>
	<div class="macos-sidebar-widget">
		<div v-if="title" class="widget-header">
			<div v-if="icon" class="widget-icon-wrapper">
				<NIcon :component="icon" :color="iconColor" size="16" />
			</div>
			<span class="widget-title">{{ title }}</span>
		</div>
		<div class="widget-content">
			<slot />
		</div>
	</div>
</template>

<style scoped>
.macos-sidebar-widget {
	background: rgba(255, 255, 255, 0.72);
	backdrop-filter: blur(20px) saturate(180%);
	-webkit-backdrop-filter: blur(20px) saturate(180%);
	border: 1px solid rgba(255, 255, 255, 0.5);
	border-radius: 14px;
	padding: 16px;
	box-shadow:
		0 0 0 1px rgba(0, 0, 0, 0.03),
		0 2px 4px rgba(0, 0, 0, 0.02),
		0 8px 24px rgba(0, 0, 0, 0.06);
	margin-bottom: 16px;
}

.widget-header {
	display: flex;
	align-items: center;
	gap: 10px;
	margin-bottom: 14px;
	padding-bottom: 12px;
	border-bottom: 1px solid rgba(0, 0, 0, 0.06);
}

.widget-icon-wrapper {
	width: 28px;
	height: 28px;
	border-radius: 8px;
	background: linear-gradient(135deg, rgba(0, 122, 255, 0.12) 0%, rgba(0, 122, 255, 0.06) 100%);
	display: flex;
	align-items: center;
	justify-content: center;
}

.widget-title {
	font-size: 13px;
	font-weight: 600;
	color: #1d1d1f;
	letter-spacing: -0.01em;
}

.widget-content {
	padding: 0;
}
</style>
