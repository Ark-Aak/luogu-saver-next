<script setup lang="ts">
import { computed, inject, ref } from 'vue';
import {
    NButton,
    NColorPicker,
    NDrawer,
    NDrawerContent,
    NForm,
    NFormItem,
    NIcon,
    NInput,
    NInputNumber,
    NSwitch,
    useMessage
} from 'naive-ui';
import { Settings } from '@vicons/ionicons5';
import { uiThemeKey } from '@/styles/theme/themeKeys.ts';
import { defaultTheme, darkTheme } from '@/styles/theme/default-theme.ts';

const uiTheme = inject(uiThemeKey);
const message = useMessage();

if (!uiTheme) {
    throw new Error('ThemeEditor 必须在 provider 内部使用');
}

const showDrawer = ref(false);

const radiusNumber = computed({
    get: () => Number.parseInt(uiTheme.value.cardRadius, 10) || 0,
    set: value => {
        uiTheme.value.cardRadius = `${value ?? 0}px`;
    }
});

const pillRadiusNumber = computed({
    get: () => Number.parseInt(uiTheme.value.pillRadius, 10) || 0,
    set: value => {
        uiTheme.value.pillRadius = `${value ?? 0}px`;
    }
});

const codeRenderInvert = computed({
    get: () => uiTheme.value.codeRenderFilter !== 'none',
    set: value => {
        uiTheme.value.codeRenderFilter = value ? 'invert(1) hue-rotate(180deg)' : 'none';
    }
});

const colorItems = [
  ['bodyColor', '页面背景色 (bodyColor)'],
  ['bodyGradientStart', '页面渐变起始色 (bodyGradientStart)'],
  ['bodyGradientEnd', '页面渐变结束色 (bodyGradientEnd)'],
  ['primaryColor', '主色 (primaryColor)'],
  ['primaryColorHover', '主色悬停色 (primaryColorHover)'],
  ['primaryColorPressed', '主色按压色 (primaryColorPressed)'],
  ['primaryColorSuppl', '补充主色 (primaryColorSuppl)'],
  ['cardColor', '卡片背景色 (cardColor)'],
  ['translucentCardColor', '半透明卡片背景色 (translucentCardColor)'],
  ['cardTitleColor', '卡片标题颜色 (cardTitleColor)'],
  ['textColor', '文本颜色 (textColor)'],
  ['secondaryTextColor', '次要文本颜色 (secondaryTextColor)'],
  ['mutedTextColor', '弱化文本颜色 (mutedTextColor)'],
  ['borderColor', '边框颜色 (borderColor)'],
  ['panelColor', '面板背景色 (panelColor)'],
  ['controlColor', '控件背景色 (controlColor)'],
  ['controlColorFocus', '控件聚焦背景色 (controlColorFocus)'],
  ['controlColorDisabled', '控件禁用背景色 (controlColorDisabled)'],
  ['controlTextColor', '控件文本色 (controlTextColor)'],
  ['controlPlaceholderColor', '控件占位文本色 (controlPlaceholderColor)'],
  ['controlBorderColor', '控件边框色 (controlBorderColor)'],
  ['controlBorderHoverColor', '控件悬停边框色 (controlBorderHoverColor)'],
  ['controlBorderFocusColor', '控件聚焦边框色 (controlBorderFocusColor)'],
  ['controlTagColor', '控件标签背景色 (controlTagColor)'],
  ['controlTagTextColor', '控件标签文本色 (controlTagTextColor)'],
  ['sliderRailColor', '滑动条轨道色 (sliderRailColor)'],
  ['sliderRailHoverColor', '滑动条悬停轨道色 (sliderRailHoverColor)'],
  ['sliderFillColor', '滑动条填充色 (sliderFillColor)'],
  ['sliderFillHoverColor', '滑动条悬停填充色 (sliderFillHoverColor)'],
  ['sliderHandleColor', '滑动条手柄色 (sliderHandleColor)'],
  ['codeBackgroundColor', '代码背景色 (codeBackgroundColor)'],
  ['codeTextColor', '代码文本颜色 (codeTextColor)'],
  ['inlineCodeBackgroundColor', '行内代码背景色 (inlineCodeBackgroundColor)'],
  ['inlineCodeTextColor', '行内代码文本色 (inlineCodeTextColor)'],
  ['markBackgroundColor', '标记背景色 (markBackgroundColor)'],
  ['tableHeaderColor', '表头背景色 (tableHeaderColor)'],
  ['scrollbarTrackColor', '滚动条轨道色 (scrollbarTrackColor)'],
  ['scrollbarThumbColor', '滚动条滑块色 (scrollbarThumbColor)'],
  ['copyButtonBackgroundColor', '复制按钮背景色 (copyButtonBackgroundColor)'],
  ['copyButtonTextColor', '复制按钮文本色 (copyButtonTextColor)'],
  ['footerTextColor', '页脚文本色 (footerTextColor)'],
  ['linkColor', '链接颜色 (linkColor)'],
  ['linkHoverColor', '链接悬停色 (linkHoverColor)'],
  ['infoColor', '信息色 (infoColor)'],
  ['successColor', '成功色 (successColor)'],
  ['warningColor', '警告色 (warningColor)'],
  ['errorColor', '错误色 (errorColor)'],
  ['orangeColor', '橙色强调 (orangeColor)'],
  ['cyanColor', '青色强调 (cyanColor)'],
  ['mutedAccentColor', '弱化强调色 (mutedAccentColor)'],
  ['iconColor', '图标颜色 (iconColor)'],
  ['userRedColor', '红名用户 (userRedColor)'],
  ['userOrangeColor', '橙名用户 (userOrangeColor)'],
  ['userPurpleColor', '紫名用户 (userPurpleColor)'],
  ['userGreenColor', '绿名用户 (userGreenColor)'],
  ['userBlueColor', '蓝名用户 (userBlueColor)'],
  ['userGrayColor', '灰名用户 (userGrayColor)'],
  ['userCheaterColor', '作弊用户 (userCheaterColor)'],
  ['prizeGreenColor', '绿钩/气球 (prizeGreenColor)'],
  ['prizeBlueColor', '蓝钩/气球 (prizeBlueColor)'],
  ['prizeGoldColor', '金钩/气球 (prizeGoldColor)'],
  ['categoryPersonalColor', '分类：个人记录 (categoryPersonalColor)'],
  ['categorySolutionColor', '分类：题解 (categorySolutionColor)'],
  ['categoryTechColor', '分类：科技工程 (categoryTechColor)'],
  ['categoryAlgorithmColor', '分类：算法理论 (categoryAlgorithmColor)'],
  ['categoryLifeColor', '分类：生活游记 (categoryLifeColor)'],
  ['categoryStudyColor', '分类：学习文化课 (categoryStudyColor)'],
  ['categoryFunColor', '分类：休闲娱乐 (categoryFunColor)'],
  ['categoryChatColor', '分类：闲话 (categoryChatColor)'],
  ['categoryUnknownColor', '分类：未知 (categoryUnknownColor)']
] as const;

const handleResetdark = () => {
    uiTheme.value = { ...darkTheme };
    message.success('已重置为深色主题');
};
const handleReset = () => {
    uiTheme.value = { ...defaultTheme };
    message.success('已重置为浅色主题');
};
</script>

<template>
    <n-button
        type="primary"
        circle
        size="large"
        class="theme-editor-trigger"
        @click="showDrawer = true"
    >
        <template #icon>
            <n-icon>
                <Settings />
            </n-icon>
        </template>
    </n-button>

    <n-drawer 
        v-model:show="showDrawer" 
        :width="380" 
        placement="right"
        :theme-overrides="{ 
            color: uiTheme?.cardColor,             
            borderRadius: uiTheme?.cardRadius,     
            boxShadow: uiTheme?.cardShadow,       
            titleTextColor: uiTheme?.cardTitleColor,
            textColor: uiTheme?.textColor          
        }"
    >
        <n-drawer-content title="主题编辑器" :style="{ '--n-color': uiTheme?.cardColor }">
            <n-form v-if="uiTheme" label-placement="top" label-width="auto" :model="uiTheme">
                <n-form-item
                    v-for="[key, label] in colorItems"
                    :key="key"
                    :label="label"
                    :path="key"
                >
                    <n-color-picker v-model:value="uiTheme[key]" show-alpha />
                </n-form-item>
                <n-form-item label="Card shadow" path="cardShadow">
                    <n-input v-model:value="uiTheme.cardShadow" />
                </n-form-item>
                <n-form-item label="Elevated shadow" path="elevatedShadow">
                    <n-input v-model:value="uiTheme.elevatedShadow" />
                </n-form-item>
                <n-form-item label="Focus ring shadow" path="focusRingShadow">
                    <n-input v-model:value="uiTheme.focusRingShadow" />
                </n-form-item>
                <n-form-item label="代码渲染反色">
                    <n-switch v-model:value="codeRenderInvert" />
                </n-form-item>
                <n-form-item label="Code render filter" path="codeRenderFilter">
                    <n-input v-model:value="uiTheme.codeRenderFilter" />
                </n-form-item>
                <n-form-item label="Radius">
                    <n-input-number v-model:value="radiusNumber" :min="0" />
                </n-form-item>
                <n-form-item label="Pill radius">
                    <n-input-number v-model:value="pillRadiusNumber" :min="0" />
                </n-form-item>
            </n-form>

            <template #footer>
                <n-button type="warning" ghost @click="handleReset">选用默认浅色</n-button>
                <n-button type="warning" ghost @click="handleResetdark">选用默认深色</n-button>
            </template>
        </n-drawer-content>
    </n-drawer>
</template>

<style scoped>
.theme-editor-trigger {
    position: fixed;
    right: 20px;
    bottom: 20px;
    z-index: 1000;
}

</style>
