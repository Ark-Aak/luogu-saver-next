<template>
	<n-config-provider :theme-overrides="themeOverrides">
		<n-message-provider>
			<n-space vertical>
				<n-layout has-sider style="height: 100vh; background-color: #f0f5ff;">
					<n-back-top :right="100"/>
					<n-layout-sider
						bordered
						show-trigger="bar"
						:collapsed="collapsed"
						:width="240"
						:collapsed-width="64"
						collapse-mode="width"
						@collapse="handleManualCollapse"
						@expand="handleManualExpand"
						@mouseenter="handleMouseEnter"
						@mouseleave="handleMouseLeave"
					>
						<div style="height: 64px; display: flex; align-items: center; justify-content: center;">
							<img v-if="!collapsed" src="/logo-text.png" alt="洛谷保存站" style="height: 32px"/>
							<img v-else src="/logo-icon.png" alt="洛谷保存站" style="height: 32px;"/>
						</div>
						
						<n-menu
							v-model:value="activeKey"
							:collapsed="collapsed"
							:collapsed-width="64"
							:options="menuOptions"
							@update:value="handleMenuSelect"
							:responsive="true"
							:accordion="true"
						/>
					</n-layout-sider>
					
					<n-layout :native-scrollbar="false">
						<n-layout-content
							content-style="padding: 24px;"
						>
							<div class="router-view">
								<router-view/>
								<ThemeEditor />
							</div>
						</n-layout-content>
						
						<IconConfigProvider size="14">
							<n-layout-footer bordered style="padding: 10px 40px;">
								<n-grid cols="2">
									<n-gi>
										<p class="footer-element">
											<Icon>
												<Copyright/>
											</Icon>
											<span> 2025 洛谷保存站 </span>
										</p>
										<p class="footer-element">
											<a href="https://github.com/laikit-dev/luogu-saver-next"
											   class="footer-link">
												<Icon>
													<Github/>
												</Icon>
												<span> GitHub </span>
											</a>
											<a href="https://help.luogu.me" class="footer-link">
												<Icon>
													<Book/>
												</Icon>
												<span> 帮助文档 </span>
											</a>
											<a href="https://help.luogu.me/docs/update" class="footer-link">
												<Icon>
													<History/>
												</Icon>
												<span> 更新日志 </span>
											</a>
										</p>
										<p class="footer-element">
											<Icon>
												<Clock/>
											</Icon>
											<span> 本网站已运行 {{ timeSinceFound }} 秒 </span>
										</p>
										<p class="footer-element">
											<a href="https://github.com/laikit-dev/luogu-saver/graphs/contributors"
											   class="footer-link">
												<Icon>
													<Users/>
												</Icon>
												<span> 项目贡献者 </span>
											</a>
										</p>
									</n-gi>
									<n-gi>
										<p class="footer-element right-aligned">
											<Icon><Code/></Icon>
											<span> 开发者：Federico2903 & Murasame & quanac-lcx </span>
										</p>
										<p class="footer-element right-aligned">
											<a href="https://qm.qq.com/q/QVM9YFEb26" target="_blank"
											   class="footer-link">
												<Icon>
													<Qq/>
												</Icon>
												<span>洛谷保存站用户群：1017248143（点击加入）</span>
											</a>
										</p>
										<p class="footer-element right-aligned">
											<a href="/privacy" class="footer-link">
												<Icon>
													<UserShield/>
												</Icon>
												<span>隐私协议</span>
											</a>
											<a href="/disclaimer" class="footer-link">
												<Icon>
													<ExclamationCircle/>
												</Icon>
												<span>免责声明</span>
											</a>
											<a href="/deletion" class="footer-link">
												<Icon>
													<TrashAlt/>
												</Icon>
												<span>数据移除政策</span>
											</a>
										</p>
										<p class="footer-element right-aligned">
											<a href="https://www.rainyun.com/MjUxMDAy_?s=saver" target="_blank"
											   class="footer-link">
												<Icon>
													<Server/>
												</Icon>
												<span>本站由雨云提供支持</span>
											</a>
										</p>
									</n-gi>
								</n-grid>
							</n-layout-footer>
						</IconConfigProvider>
					</n-layout>
				</n-layout>
			</n-space>
		</n-message-provider>
	</n-config-provider>
</template>

<script setup lang="ts">
import { provide, ref, computed, watch } from 'vue';
import { useRouter } from 'vue-router';
import {
	NLayout, NLayoutSider, NLayoutContent, NLayoutFooter,
	NSpace, NMenu, NConfigProvider, type GlobalThemeOverrides, NGrid, NGi,
	type MenuOption, NMessageProvider
} from 'naive-ui';

import {
	HomeOutline, AppsOutline, PersonOutline,
	SearchOutline, BrushOutline, ShareSocialOutline, ListOutline,
	AtOutline, CloudCircleOutline, CloudDownloadOutline, ImageOutline, KeyOutline,
	StatsChartOutline, HammerOutline, GlobeOutline
} from '@vicons/ionicons5';

import { Icon, IconConfigProvider } from '@vicons/utils';

import {
	Copyright, Code, UserShield, ExclamationCircle,
	TrashAlt, Qq, Server, Github, Clock, Book, History, Users
} from '@vicons/fa';

import { renderIcon } from '@/utils/render';

import ThemeEditor from '@/components/ThemeEditor.vue';

import { uiThemeKey, type UiThemeVars } from '@/styles/themeKeys';

const activeKey = ref('home');
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
		label: '用户',
		key: 'user',
		icon: renderIcon(PersonOutline)
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
		label: '犇犇',
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
		label: '最近更新',
		key: 'recent',
		icon: renderIcon(GlobeOutline)
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
	}
];

const THEME_STORAGE_KEY = 'luogu-saver-ui-theme';
const savedTheme = localStorage.getItem(THEME_STORAGE_KEY);
const parsedTheme = savedTheme ? JSON.parse(savedTheme) : null;

const uiThemeVars = ref<UiThemeVars>(parsedTheme ? parsedTheme : {
	bodyColor: '#f8fafc',
	primaryColor: '#18a058',
	primaryColorHover: '#36ad6a',
	primaryColorPressed: '#0c7a43',
	primaryColorSuppl: '#36ad6a',
	cardColor: '#ffffff',
	cardTitleColor: 'rgba(24, 160, 88, 0.1)',
	cardShadow: '2px 2px 4px #e4e4e4',
	iconColor: '#36ad6a'
});

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
			fontFamily: "'Lato', sans-serif",
			fontFamilyMono: "'Fira Code', monospace",
			bodyColor: uiThemeVars.value.bodyColor,
			primaryColor: uiThemeVars.value.primaryColor,
			primaryColorHover: uiThemeVars.value.primaryColorHover,
			primaryColorPressed: uiThemeVars.value.primaryColorPressed,
			primaryColorSuppl: uiThemeVars.value.primaryColorSuppl,
			cardColor: uiThemeVars.value.cardColor
		}
	};
});

const router = useRouter();

const handleMenuSelect = (key: string) => {
	activeKey.value = key;
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
</script>

<style scoped>
.n-layout {
	height: 100vh;
}
.footer-element {
	display: flex;
	align-items: center;
}
.footer-element.right-aligned {
	justify-content: flex-end;
}
.footer-element > :nth-child(2) {
	margin-left: 8px;
}
.footer-element > a > :nth-child(2) {
	margin-left: 8px;
}
.footer-link {
	display: flex;
	align-items: center;
	color: #000;
	transition: color 0.2s;
	text-decoration: none;
}
.footer-link:hover {
	color: #337ab7 !important;
	text-decoration-color: #000;
	text-underline-position: under;
}
.footer-link:not(:first-child) {
	margin-left: 16px;
}
.router-view {
	max-width: 1200px;
	margin: 0 auto;
}
</style>