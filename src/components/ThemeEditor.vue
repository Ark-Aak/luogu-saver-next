<script setup lang="ts">
import { inject, ref } from 'vue';
import { NButton, NColorPicker, NDrawer, NDrawerContent, NForm, NFormItem, NIcon, NInput, useMessage } from 'naive-ui';
import { Settings } from '@vicons/ionicons5';
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
		style="position: fixed; right: 20px; bottom: 20px; z-index: 1000"
	>
		<template #icon>
			<n-icon>
				<Settings/>
			</n-icon>
		</template>
	</n-button>
	
	<n-drawer v-model:show="showDrawer" :width="340" placement="right">
		<n-drawer-content title="主题编辑器">
			<n-form
				v-if="uiTheme"
				label-placement="top"
				label-width="auto"
				:model="uiTheme"
			>
				<n-form-item label="页面背景色 (bodyColor)" path="bodyColor">
					<n-color-picker v-model:value="uiTheme.bodyColor"/>
				</n-form-item>
				<n-form-item label="主色 (primaryColor)" path="primaryColor">
					<n-color-picker v-model:value="uiTheme.primaryColor"/>
				</n-form-item>
				<n-form-item label="主色 (primaryColorHover)" path="primaryColorHover">
					<n-color-picker v-model:value="uiTheme.primaryColorHover"/>
				</n-form-item>
				<n-form-item label="主色 (primaryColorPressed)" path="primaryColorPressed">
					<n-color-picker v-model:value="uiTheme.primaryColorPressed"/>
				</n-form-item>
				<n-form-item label="主色 (primaryColorSup pl)" path="primaryColorSuppl">
					<n-color-picker v-model:value="uiTheme.primaryColorSuppl"/>
				</n-form-item>
				<n-form-item label="卡片颜色 (cardColor)" path="cardColor">
					<n-color-picker v-model:value="uiTheme.cardColor"/>
				</n-form-item>
				<n-form-item label="自定义卡片阴影 (cardShadow)" path="cardShadow">
					<n-input v-model:value="uiTheme.cardShadow"/>
				</n-form-item>
			</n-form>
			
			<template #footer>
				<n-button @click="handleReset" type="warning" ghost>
					重置为默认
				</n-button>
			</template>
		</n-drawer-content>
	</n-drawer>
</template>