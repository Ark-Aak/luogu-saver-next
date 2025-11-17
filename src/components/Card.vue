<script setup lang="ts">
import { type CSSProperties, inject } from "vue";
import { NCard, NH3, NIcon } from 'naive-ui';
import { computed, type Component } from 'vue'
import { uiThemeKey, type UiThemeVars } from '@/styles/themeKeys';

const themeVars: UiThemeVars = inject(uiThemeKey)!;

const props = defineProps({
	title: {
		type: String
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
	}
})

const effectiveIconColor = computed(() => {
	return props.iconColor || themeVars.value.iconColor
})

const effectiveBackgroundColor = computed(() => {
	return props.backgroundColor || themeVars.value.cardColor
})

const containerStyle = computed(() : CSSProperties => ({
	padding: '24px',
	borderRadius: '8px',
	backgroundColor: effectiveBackgroundColor.value,
	boxShadow: '2px 2px 4px #e4e4e4'
}))

</script>

<template>
	<n-card :bordered="false" content-style="padding: 0;">
		<div :style="containerStyle">
			<n-h3 v-if="title" class="title">
				<span style="display: flex; align-items: center; gap: 8px; font-weight: bold;">
					<n-icon v-if="icon" :component="icon" :color="effectiveIconColor" size="24" :depth="1" />
					{{ title }}
				</span>
			</n-h3>
			<slot />
		</div>
	</n-card>
</template>

<style scoped>

</style>