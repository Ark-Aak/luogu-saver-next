<template>
	<n-config-provider :theme-overrides="themeOverrides">
		<n-message-provider>
			<div class="macos-app">
				<n-layout has-sider class="main-layout">
					<!-- Glassmorphism Sidebar -->
					<n-layout-sider
						class="glass-sidebar"
						:bordered="false"
						:collapsed="collapsed"
						:width="260"
						:collapsed-width="72"
						collapse-mode="width"
						@collapse="handleManualCollapse"
						@expand="handleManualExpand"
						@mouseenter="handleMouseEnter"
						@mouseleave="handleMouseLeave"
					>
						<!-- Logo area -->
						<div class="sidebar-header">
							<div class="logo-wrapper">
								<img v-if="!collapsed" src="/logo-text.png" alt="洛谷保存站" class="logo-full"/>
								<img v-else src="/logo-icon.png" alt="洛谷保存站" class="logo-icon"/>
							</div>
						</div>

						<!-- Navigation -->
						<div class="nav-container">
							<n-menu
								v-model:value="activeKey"
								:collapsed="collapsed"
								:collapsed-width="72"
								:options="menuOptions"
								@update:value="handleMenuSelect"
								:responsive="true"
								:accordion="true"
								:indent="16"
							/>
						</div>
					</n-layout-sider>

					<n-dialog-provider>
						<n-layout :native-scrollbar="false" class="content-layout">
							<n-layout-content content-style="padding: 32px 40px;">
								<div class="router-view">
									<n-back-top :right="40" :bottom="40"/>
									<router-view/>
								</div>

								<!-- Footer -->
								<footer class="glass-footer">
									<div class="footer-content">
										<div class="footer-left">
											<p class="footer-row">
												<span class="footer-copyright">© 2025 洛谷保存站</span>
											</p>
											<p class="footer-row">
												<a href="https://github.com/laikit-dev/luogu-saver-next" class="footer-link">GitHub</a>
												<span class="footer-divider">·</span>
												<a href="https://help.luogu.me" class="footer-link">帮助文档</a>
												<span class="footer-divider">·</span>
												<a href="https://help.luogu.me/docs/update" class="footer-link">更新日志</a>
												<span class="footer-divider">·</span>
												<a href="https://github.com/laikit-dev/luogu-saver/graphs/contributors" class="footer-link">贡献者</a>
											</p>
											<p class="footer-row footer-meta">
												已运行 {{ formatRuntime(timeSinceFound) }}
											</p>
										</div>
										<div class="footer-right">
											<p class="footer-row">
												<span class="footer-text">开发者：Federico2903 & Murasame & quanac-lcx</span>
											</p>
											<p class="footer-row">
												<a href="/privacy" class="footer-link">隐私协议</a>
												<span class="footer-divider">·</span>
												<a href="/disclaimer" class="footer-link">免责声明</a>
												<span class="footer-divider">·</span>
												<a href="/deletion" class="footer-link">数据移除</a>
											</p>
											<p class="footer-row">
												<a href="https://qm.qq.com/q/QVM9YFEb26" target="_blank" class="footer-link">QQ群：1017248143</a>
												<span class="footer-divider">·</span>
												<a href="https://www.rainyun.com/MjUxMDAy_?s=saver" target="_blank" class="footer-link">雨云提供支持</a>
											</p>
										</div>
									</div>
								</footer>
							</n-layout-content>
						</n-layout>
					</n-dialog-provider>
					<TrackingConsent/>
				</n-layout>
			</div>
		</n-message-provider>
	</n-config-provider>
</template>

<script setup lang="ts">
import { provide, ref, computed, watch } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import {
	NLayout, NLayoutSider, NLayoutContent,
	NMenu, NConfigProvider, type GlobalThemeOverrides,
	type MenuOption, NMessageProvider, NBackTop, NDialogProvider
} from 'naive-ui';

import {
	HomeOutline, AppsOutline,
	SearchOutline, BrushOutline, ShareSocialOutline, ListOutline,
	AtOutline, CloudCircleOutline, CloudDownloadOutline, ImageOutline, KeyOutline,
	StatsChartOutline, HammerOutline, GlobeOutline, SettingsOutline
} from '@vicons/ionicons5';

import { renderIcon } from '@/utils/render';

import { uiThemeKey, type UiThemeVars } from '@/styles/theme/themeKeys.ts';
import { defaultTheme } from "@/styles/theme/default-theme.ts";
import TrackingConsent from "@/components/TrackingConsent.vue";

const router = useRouter();
const route = useRoute();

const activeKey = computed(() => {
	console.log(JSON.stringify(route.meta));
	return (route.meta.activeMenu as string) || ((route.path as string).slice(1));
})
const collapsed = ref(true);
const manualToggle = ref(false);

const handleMouseEnter = () => {
	if (collapsed.value && !manualToggle.value) {
		collapsed.value = false;
	}
};

const handleMouseLeave = () => {
	if (!collapsed.value && !manualToggle.value) {
		collapsed.value = true;
	}
};

const handleManualCollapse = () => {
	manualToggle.value = true;
	collapsed.value = true;
};

const handleManualExpand = () => {
	manualToggle.value = true;
	collapsed.value = false;
};

const menuOptions : MenuOption[] = [
	{
		label: '主页',
		key: 'home',
		icon: renderIcon(HomeOutline)
	},
	{
		label: '搜索',
		key: 'search',
		icon: renderIcon(SearchOutline)
	},
	{
		label: '题目',
		key: 'problem',
		icon: renderIcon(ListOutline)
	},
	{
		label: '文章广场',
		key: 'plaza',
		icon: renderIcon(GlobeOutline)
	},
	{
		label: '用户动态',
		key: 'benben',
		icon: renderIcon(ShareSocialOutline),
		children: [
			{
				label: '被 at 查询',
				key: 'benben/mentions',
				icon: renderIcon(AtOutline)
			},
			{
				label: '用户历史',
				key: 'benben/history',
				icon: renderIcon(CloudCircleOutline)
			},
			{
				label: '用户抓取',
				key: 'benben/crawl',
				icon: renderIcon(CloudDownloadOutline)
			}
		]
	},
	{
		label: '冬日绘板',
		key: 'paintboard',
		icon: renderIcon(BrushOutline),
		children: [
			{
				label: '查看绘板',
				key: 'paintboard/view',
				icon: renderIcon(ImageOutline)
			},
			{
				label: '申请凭据',
				key: 'paintboard/token',
				icon: renderIcon(KeyOutline)
			}
		]
	},
	{
		label: '陶片放逐',
		key: 'judgement',
		icon: renderIcon(HammerOutline)
	},
	{
		label: '统计数据',
		key: 'statistic',
		icon: renderIcon(StatsChartOutline)
	},
	{
		label: '关于',
		key: 'about',
		icon: renderIcon(AppsOutline)
	},
	{
		label: '设置',
		key: 'settings',
		icon: renderIcon(SettingsOutline)
	}
];

import { THEME_STORAGE_KEY } from '@/utils/constants.ts';
const savedTheme = localStorage.getItem(THEME_STORAGE_KEY);
const parsedTheme = savedTheme ? JSON.parse(savedTheme) : null;

const uiThemeVars = ref<UiThemeVars>(parsedTheme ? { ...defaultTheme, ...parsedTheme } : defaultTheme);

provide(uiThemeKey, uiThemeVars);

watch(
	uiThemeVars,
	(newVal) => {
		localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify(newVal));
		console.log('UI theme vars updated and saved to localStorage.');
	},
	{ deep: true }
);

const themeOverrides = computed<GlobalThemeOverrides>(() => {
	return {
		common: {
			fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Helvetica Neue', sans-serif",
			fontFamilyMono: "'SF Mono', Monaco, Menlo, Consolas, monospace",
			bodyColor: uiThemeVars.value.bodyColor,
			primaryColor: uiThemeVars.value.primaryColor,
			primaryColorHover: uiThemeVars.value.primaryColorHover,
			primaryColorPressed: uiThemeVars.value.primaryColorPressed,
			primaryColorSuppl: uiThemeVars.value.primaryColorSuppl,
			cardColor: uiThemeVars.value.cardColor,
			borderRadius: '10px',
			borderRadiusSmall: '6px'
		},
		Button: {
			borderRadiusMedium: '8px',
			borderRadiusSmall: '6px',
			fontWeightStrong: '500',
			paddingMedium: '0 16px',
			heightMedium: '34px'
		},
		Input: {
			borderRadius: '10px',
			heightMedium: '38px'
		},
		Tag: {
			borderRadius: '6px',
			fontWeight: '500'
		},
		Card: {
			borderRadius: '16px'
		},
		Menu: {
			borderRadius: '8px',
			itemColorActive: 'rgba(0, 122, 255, 0.12)',
			itemColorActiveHover: 'rgba(0, 122, 255, 0.15)',
			itemTextColorActive: '#007AFF',
			itemTextColorActiveHover: '#007AFF',
			itemIconColorActive: '#007AFF',
			itemIconColorActiveHover: '#007AFF'
		},
		Divider: {
			color: 'rgba(0, 0, 0, 0.06)'
		}
	};
});

const handleMenuSelect = (key: string) => {
	if (key === 'home') {
		router.push('/');
	}
	else {
		router.push(`/${key}`);
	}
};

const foundDate = new Date('2025-02-12T00:00:00Z').getTime();
const timeSinceFound = ref(Math.floor((Date.now() - foundDate) / 1000));
setInterval(() => {
	timeSinceFound.value = Math.floor((Date.now() - foundDate) / 1000);
}, 1000);

const formatRuntime = (seconds: number) => {
	const days = Math.floor(seconds / 86400);
	const hours = Math.floor((seconds % 86400) / 3600);
	const mins = Math.floor((seconds % 3600) / 60);
	if (days > 0) return `${days}天 ${hours}小时`;
	if (hours > 0) return `${hours}小时 ${mins}分钟`;
	return `${mins}分钟 ${seconds % 60}秒`;
};
</script>

<style scoped>
/* ============================================
   APPLE-STYLE GLASSMORPHISM
   Clean, neutral, professional
   ============================================ */

.macos-app {
	min-height: 100vh;
	background: #f5f5f7;
	font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'SF Pro Text', system-ui, sans-serif;
}

.main-layout {
	height: 100vh;
	background: transparent !important;
}

.content-layout {
	background: transparent !important;
}

/* ============================================
   GLASSMORPHISM SIDEBAR
   ============================================ */
.glass-sidebar {
	background: rgba(255, 255, 255, 0.2) !important;
	backdrop-filter: blur(20px);
	-webkit-backdrop-filter: blur(20px);
	border-right: 1px solid rgba(255, 255, 255, 0.3) !important;
	box-shadow: 0 4px 30px rgba(0, 0, 0, 0.1);
}

.sidebar-header {
	padding: 20px 16px;
}

.logo-wrapper {
	display: flex;
	align-items: center;
	justify-content: center;
}

.logo-full {
	height: 32px;
	width: auto;
}

.logo-icon {
	height: 28px;
	width: 28px;
}

.nav-container {
	flex: 1;
	overflow-y: auto;
	padding: 8px 12px;
}

/* ============================================
   MENU ITEMS - FIXED ALIGNMENT
   ============================================ */
:deep(.n-menu) {
	background: transparent !important;
}

:deep(.n-menu-item) {
	margin: 2px 0;
	border-radius: 10px !important;
	height: 40px !important;
}

:deep(.n-menu-item-content) {
	padding: 0 12px !important;
	border-radius: 10px !important;
	font-size: 14px !important;
	font-weight: 400 !important;
	color: #1d1d1f !important;
	transition: all 0.2s ease;
	height: 40px !important;
	line-height: 40px !important;
	display: flex !important;
	align-items: center !important;
}

:deep(.n-menu-item-content:hover) {
	background: rgba(0, 0, 0, 0.04) !important;
}

:deep(.n-menu-item-content--selected) {
	background: rgba(0, 0, 0, 0.06) !important;
	font-weight: 500 !important;
	color: #1d1d1f !important;
}

:deep(.n-menu-item-content--selected::before) {
	display: none !important;
}

:deep(.n-submenu-children) {
	padding-left: 8px !important;
	background: transparent !important;
}

:deep(.n-menu-item-content__icon) {
	color: #1d1d1f !important;
	margin-right: 8px !important;
	display: flex !important;
	align-items: center !important;
}

:deep(.n-menu-item-content__arrow) {
	color: rgba(0, 0, 0, 0.3) !important;
}

:deep(.n-layout-toggle-bar),
:deep(.n-layout-sider__border) {
	display: none !important;
}

:deep(.n-layout-sider-scroll-container) {
	background: transparent !important;
}

/* ============================================
   CONTENT AREA
   ============================================ */
.router-view {
	max-width: 1400px;
	margin: 0 auto;
	min-height: calc(100vh - 200px);
}

/* ============================================
   FOOTER
   ============================================ */
.glass-footer {
	margin-top: 60px;
	padding: 24px 40px;
	margin-left: -40px;
	margin-right: -40px;
	margin-bottom: -32px;
	background: rgba(255, 255, 255, 0.2);
	backdrop-filter: blur(20px);
	-webkit-backdrop-filter: blur(20px);
	border-top: 1px solid rgba(255, 255, 255, 0.3);
	border-radius: 20px 20px 0 0;
	box-shadow: 0 -4px 30px rgba(0, 0, 0, 0.05);
}

.footer-content {
	display: flex;
	justify-content: space-between;
	align-items: flex-start;
}

.footer-left,
.footer-right {
	display: flex;
	flex-direction: column;
	gap: 6px;
}

.footer-right {
	text-align: right;
	align-items: flex-end;
}

.footer-row {
	margin: 0;
	font-size: 12px;
	color: #86868b;
	display: flex;
	align-items: center;
	gap: 4px;
}

.footer-copyright {
	font-weight: 500;
	color: #1d1d1f;
}

.footer-text {
	color: #86868b;
}

.footer-link {
	color: #515154 !important;
	text-decoration: none;
	transition: color 0.2s ease;
}

.footer-link:hover {
	color: #1d1d1f !important;
}

.footer-divider {
	color: #d2d2d7;
}

.footer-meta {
	font-size: 11px;
	color: #86868b;
}

/* ============================================
   BACK TO TOP
   ============================================ */
:deep(.n-back-top) {
	background: rgba(255, 255, 255, 0.2) !important;
	backdrop-filter: blur(20px);
	-webkit-backdrop-filter: blur(20px);
	border: 1px solid rgba(255, 255, 255, 0.3) !important;
	border-radius: 12px !important;
	box-shadow: 0 4px 30px rgba(0, 0, 0, 0.1) !important;
	transition: all 0.2s ease !important;
}

:deep(.n-back-top:hover) {
	transform: translateY(-2px);
	box-shadow: 0 6px 30px rgba(0, 0, 0, 0.12) !important;
}
</style>