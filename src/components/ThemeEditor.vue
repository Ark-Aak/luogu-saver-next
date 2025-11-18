<script setup lang="ts">
import {inject, ref} from 'vue'
import {NButton, NColorPicker, NDrawer, NDrawerContent, NForm, NFormItem, NIcon, NInput, useMessage} from 'naive-ui'
import {Settings as SettingsIcon} from '@vicons/ionicons5'
import {uiThemeKey, type UiThemeVars} from '@/styles/themeKeys'

const uiTheme = inject(uiThemeKey)
const message = useMessage()

if (!uiTheme) {
	throw new Error('ThemeEditor 必须在 provider 内部使用')
}

const showDrawer = ref(false)

const handleReset = () => {
	uiTheme.value = {
		bodyColor: '#f8fafc',
		primaryColor: '#18a058',
		primaryColorHover: '#36ad6a',
		primaryColorPressed: '#0c7a43',
		primaryColorSuppl: '#36ad6a',
		cardColor: '#ffffff',
		cardShadow: '2px 2px 4px #e4e4e4',
	}
	message.success('已重置为默认主题')
}

</script>

<template>
	<n-button
		type="primary"
		circle
		@click="showDrawer = true"
		style="position: fixed; right: 20px; bottom: 20px; z-index: 1000"
	>
		<template #icon>
			<n-icon>
				<settings-icon/>
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
				<h3>Naive UI 通用变量</h3>
				<n-form-item label="页面背景色 (bodyColor)" path="bodyColor">
					<n-color-picker v-model:value="uiTheme.bodyColor"/>
				</n-form-item>
				<n-form-item label="主色 (primaryColor)" path="primaryColor">
					<n-color-picker v-model:value="uiTheme.primaryColor"/>
				</n-form-item>
				<n-form-item label="卡片颜色 (cardColor)" path="cardColor">
					<n-color-picker v-model:value="uiTheme.cardColor"/>
				</n-form-item>
				
				<h3>您的自定义变量</h3>
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