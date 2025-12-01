<script setup lang="ts">
import { computed, type Component, type CSSProperties } from 'vue';
import { NIcon, NCard, NH1, NText } from 'naive-ui';
import { uiThemeKey, type UiThemeVars } from '@/styles/theme/themeKeys.ts';
import { inject } from 'vue';
import { hexToRgba } from '@/utils/render';

const themeVars: UiThemeVars = inject(uiThemeKey)!;

const props = defineProps({
	title: {
		type: String,
		required: true,
	},
	icon: {
		type: Object as () => Component,
		default: null,
	},
	backgroundColor: {
		type: String,
		default: null,
	},
	iconColor: {
		type: String,
		default: null,
	}
})

const containerStyle = computed((): CSSProperties => ({
	textAlign: 'center',
	backgroundColor: props.backgroundColor || hexToRgba(themeVars.value.primaryColor, 0.1),
	padding: '16px',
	borderRadius: '8px'
}))

const titleStyle = computed((): CSSProperties => ({
	color: props.textColor || themeVars.value.primaryColor,
	display: 'flex',
	alignItems: 'center',
	justifyContent: 'center',
	gap: '8px'
}))

const effectiveIconColor = computed(() => {
	return props.iconColor || themeVars.value.primaryColor;
});
</script>

<template>
	<n-card :bordered="false" content-style="padding: 0;">
		<div :style="containerStyle">
			<n-h1 class="title">
				<span :style="titleStyle">
					<n-icon v-if="icon" :component="icon" :color="effectiveIconColor" size="36" :depth="1" />
					{{ title }}
				</span>
			</n-h1>
			<n-text class="subtitle" :depth="3">
				<slot />
			</n-text>
		</div>
	</n-card>
</template>

<style scoped>
.title {
	margin-top: 8px;
	margin-bottom: 4px;
	font-weight: bold;
}
.subtitle {
	font-size: 1rem;
}
</style>