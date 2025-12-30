<script setup lang="ts">
import { type CSSProperties, inject, computed, type Component, useSlots } from "vue";
import { NIcon } from 'naive-ui';
import { uiThemeKey, type UiThemeVars } from '@/styles/theme/themeKeys.ts';

const themeVars: UiThemeVars = inject(uiThemeKey)!;
const slots = useSlots();

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
	},
	hoverable: {
		type: Boolean,
		default: false
	}
})

const effectiveIconColor = computed(() => {
	return props.iconColor || themeVars.value.primaryColor
})

const effectiveBackgroundColor = computed(() => {
	return props.backgroundColor || themeVars.value.cardColor
})

const cardStyle = computed(() : CSSProperties => ({
	backgroundColor: effectiveBackgroundColor.value,
}))

const showHeader = computed(() => {
	return !!props.title || !!slots['header-extra'];
});

</script>

<template>
	<div class="saver-card" :class="{ 'is-hoverable': hoverable }" :style="cardStyle">
		<div class="card-header" v-if="showHeader">
			<div class="card-title-wrapper">
				<n-icon v-if="icon" :component="icon" :color="effectiveIconColor" size="24" :depth="1" />
				<span v-if="title" class="card-title" :style="{ color: themeVars.cardTitleColor }">{{ title }}</span>
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
	padding: 24px;
	border-radius: 12px;
	box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
	transition: transform 0.3s ease, box-shadow 0.3s ease;
	display: flex;
	flex-direction: column;
}

.saver-card.is-hoverable:hover {
	transform: translateY(-4px);
	box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1);
}

.card-header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	margin-bottom: 16px;
}

.card-title-wrapper {
	display: flex;
	align-items: center;
	gap: 8px;
}

.card-title {
	font-weight: bold;
	font-size: 18px;
	line-height: 1;
}

.card-content {
	flex: 1;
}
</style>