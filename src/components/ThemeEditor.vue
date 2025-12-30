<script setup lang="ts">
import { inject, ref } from 'vue';
import { NButton, NColorPicker, NDrawer, NDrawerContent, NForm, NFormItem, NIcon, NInput, useMessage } from 'naive-ui';
import { ColorPaletteOutline } from '@vicons/ionicons5';
import { uiThemeKey, type UiThemeVars } from '@/styles/theme/themeKeys.ts';
import { defaultTheme } from '@/styles/theme/default-theme.ts';

const uiTheme = inject(uiThemeKey);
const message = useMessage();

if (!uiTheme) {
	throw new Error('ThemeEditor 必须在 provider 内部使用');
}

const showDrawer = ref(false);

const handleReset = () => {
	uiTheme.value = defaultTheme;
	message.success('已重置为默认主题');
}

</script>

<template>
	<n-button
		type="primary"
		circle
		size="large"
		@click="showDrawer = true"
		class="theme-fab"
	>
		<template #icon>
			<n-icon :component="ColorPaletteOutline" />
		</template>
	</n-button>

	<n-drawer v-model:show="showDrawer" :width="360" placement="right" class="macos-drawer">
		<n-drawer-content title="主题编辑器" closable>
			<template #header>
				<div class="drawer-header">
					<div class="drawer-icon">
						<n-icon :component="ColorPaletteOutline" size="20" color="#007AFF" />
					</div>
					<span>主题编辑器</span>
				</div>
			</template>

			<n-form
				v-if="uiTheme"
				label-placement="top"
				label-width="auto"
				:model="uiTheme"
				class="theme-form"
			>
				<n-form-item label="页面背景色" path="bodyColor">
					<n-color-picker v-model:value="uiTheme.bodyColor" :show-alpha="false" />
				</n-form-item>
				<n-form-item label="主色调" path="primaryColor">
					<n-color-picker v-model:value="uiTheme.primaryColor" :show-alpha="false" />
				</n-form-item>
				<n-form-item label="主色调 (悬停)" path="primaryColorHover">
					<n-color-picker v-model:value="uiTheme.primaryColorHover" :show-alpha="false" />
				</n-form-item>
				<n-form-item label="主色调 (按下)" path="primaryColorPressed">
					<n-color-picker v-model:value="uiTheme.primaryColorPressed" :show-alpha="false" />
				</n-form-item>
				<n-form-item label="辅助色" path="primaryColorSuppl">
					<n-color-picker v-model:value="uiTheme.primaryColorSuppl" :show-alpha="false" />
				</n-form-item>
				<n-form-item label="卡片背景色" path="cardColor">
					<n-color-picker v-model:value="uiTheme.cardColor" :show-alpha="true" />
				</n-form-item>
				<n-form-item label="卡片阴影" path="cardShadow">
					<n-input v-model:value="uiTheme.cardShadow" placeholder="例如：0 4px 12px rgba(0,0,0,0.1)" />
				</n-form-item>
			</n-form>

			<template #footer>
				<n-button @click="handleReset" class="reset-button">
					重置为默认
				</n-button>
			</template>
		</n-drawer-content>
	</n-drawer>
</template>

<style scoped>
.theme-fab {
	position: fixed;
	right: 24px;
	bottom: 24px;
	z-index: 1000;
	width: 52px !important;
	height: 52px !important;
	background: linear-gradient(180deg, #0A84FF 0%, #007AFF 100%) !important;
	border: none !important;
	box-shadow:
		0 4px 16px rgba(0, 122, 255, 0.4),
		0 0 0 1px rgba(255, 255, 255, 0.2) inset !important;
	transition: all 0.25s cubic-bezier(0.25, 0.1, 0.25, 1) !important;
}

.theme-fab:hover {
	transform: scale(1.05);
	box-shadow:
		0 6px 24px rgba(0, 122, 255, 0.5),
		0 0 0 1px rgba(255, 255, 255, 0.3) inset !important;
}

.theme-fab:active {
	transform: scale(0.98);
}

.drawer-header {
	display: flex;
	align-items: center;
	gap: 12px;
	font-weight: 600;
	font-size: 16px;
	color: #1d1d1f;
}

.drawer-icon {
	width: 32px;
	height: 32px;
	border-radius: 8px;
	background: linear-gradient(135deg, rgba(0, 122, 255, 0.12) 0%, rgba(0, 122, 255, 0.06) 100%);
	display: flex;
	align-items: center;
	justify-content: center;
}

.theme-form {
	padding: 8px 0;
}

:deep(.n-form-item-label__text) {
	font-size: 13px !important;
	font-weight: 500 !important;
	color: #48484a !important;
}

:deep(.n-color-picker-trigger) {
	border-radius: 10px !important;
	border: 1px solid rgba(0, 0, 0, 0.1) !important;
}

:deep(.n-input) {
	border-radius: 10px !important;
}

.reset-button {
	width: 100%;
	border-radius: 10px !important;
	height: 40px !important;
	font-weight: 500 !important;
	background: rgba(255, 149, 0, 0.1) !important;
	color: #FF9500 !important;
	border: 1px solid rgba(255, 149, 0, 0.3) !important;
}

.reset-button:hover {
	background: rgba(255, 149, 0, 0.15) !important;
}

/* Drawer styling */
:deep(.n-drawer-content) {
	background: rgba(255, 255, 255, 0.95) !important;
	backdrop-filter: blur(20px) saturate(180%);
}

:deep(.n-drawer-header) {
	border-bottom: 1px solid rgba(0, 0, 0, 0.06) !important;
	padding: 16px 20px !important;
}

:deep(.n-drawer-body) {
	padding: 16px 20px !important;
}

:deep(.n-drawer-footer) {
	border-top: 1px solid rgba(0, 0, 0, 0.06) !important;
	padding: 16px 20px !important;
}
</style>