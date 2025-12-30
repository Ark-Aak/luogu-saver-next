<script setup lang="ts">
import { type CSSProperties, inject, computed, type Component, useSlots, type Ref } from "vue";
import { NIcon } from 'naive-ui';
import { uiThemeKey, type UiThemeVars } from '@/styles/theme/themeKeys.ts';

const themeVars = inject(uiThemeKey) as Ref<UiThemeVars>;
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
	if (props.vibrancy) {
		return props.backgroundColor || 'rgba(255, 255, 255, 0.72)';
	}
	return props.backgroundColor || themeVars.value.cardColor;
})

const cardStyle = computed(() : CSSProperties => ({
	backgroundColor: effectiveBackgroundColor.value,
}))

const showHeader = computed(() => {
	return !!props.title || !!slots['header-extra'];
});

const titleColor = computed(() => {
	return themeVars?.value?.textColor || '#1d1d1f';
});

</script>

<template>
	<div class="macos-card" :class="{ 'is-hoverable': hoverable, 'has-vibrancy': vibrancy }" :style="cardStyle">
		<div class="card-header" v-if="showHeader">
			<div class="card-title-wrapper">
				<div v-if="icon" class="card-icon-wrapper">
					<n-icon :component="icon" :color="effectiveIconColor" size="20" :depth="1" />
				</div>
				<span v-if="title" class="card-title" :style="{ color: titleColor }">{{ title }}</span>
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
/* TRUE GLASSMORPHISM CARD */
.macos-card {
	padding: 24px 28px;
	border-radius: 20px;
	background: rgba(255, 255, 255, 0.2);
	border: 1px solid rgba(255, 255, 255, 0.3);
	box-shadow: 0 4px 30px rgba(0, 0, 0, 0.1);
	transition: all 0.3s ease;
	display: flex;
	flex-direction: column;
}

.macos-card.has-vibrancy {
	backdrop-filter: blur(20px);
	-webkit-backdrop-filter: blur(20px);
}

.macos-card.is-hoverable:hover {
	transform: translateY(-4px);
	background: rgba(255, 255, 255, 0.25);
	box-shadow: 0 8px 40px rgba(0, 0, 0, 0.15);
}

.card-header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	margin-bottom: 20px;
}

.card-title-wrapper {
	display: flex;
	align-items: center;
	gap: 12px;
}

.card-icon-wrapper {
	width: 36px;
	height: 36px;
	border-radius: 10px;
	background: rgba(255, 255, 255, 0.2);
	border: 1px solid rgba(255, 255, 255, 0.3);
	display: flex;
	align-items: center;
	justify-content: center;
}

.card-title {
	font-weight: 600;
	font-size: 17px;
	line-height: 1;
	letter-spacing: -0.02em;
}

.card-content {
	flex: 1;
}
</style>