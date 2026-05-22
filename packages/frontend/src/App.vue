<!--suppress ALL -->
<template>
    <n-config-provider :theme-overrides="themeOverrides">
        <n-message-provider>
            <n-space vertical>
                <n-layout has-sider>
                    <n-layout-sider
                        class="app-sider"
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
                        <div class="brand-shell">
                            <img
                                v-if="!collapsed"
                                src="/logo-text.png"
                                alt="洛谷保存站"
                                style="height: 32px"
                            />
                            <img
                                v-else
                                src="/logo-icon.png"
                                alt="洛谷保存站"
                                style="height: 32px"
                            />
                        </div>

                        <n-menu
                            v-model:value="activeKey"
                            :collapsed="collapsed"
                            :collapsed-width="64"
                            :options="menuOptions"
                            :responsive="true"
                            :accordion="true"
                            @update:value="handleMenuSelect"
                        />
                    </n-layout-sider>

                    <n-dialog-provider>
                        <n-layout class="app-main" :native-scrollbar="false">
                            <n-layout-content content-style="padding: 28px;">
                                <div class="router-view">
                                    <n-back-top :right="50" />
                                    <router-view />
                                </div>

                                <IconConfigProvider size="14">
                                    <n-layout-footer bordered class="app-footer">
                                        <n-grid cols="2">
                                            <n-gi>
                                                <p class="footer-element">
                                                    <Icon>
                                                        <Copyright />
                                                    </Icon>
                                                    <span> 2025 洛谷保存站 </span>
                                                </p>
                                                <p class="footer-element">
                                                    <a
                                                        href="https://github.com/laikit-dev/luogu-saver-next"
                                                        class="footer-link"
                                                    >
                                                        <Icon>
                                                            <Github />
                                                        </Icon>
                                                        <span> GitHub </span>
                                                    </a>
                                                    <a
                                                        href="https://help.luogu.me"
                                                        class="footer-link"
                                                    >
                                                        <Icon>
                                                            <Book />
                                                        </Icon>
                                                        <span> 帮助文档 </span>
                                                    </a>
                                                    <a
                                                        href="https://help.luogu.me/docs/update"
                                                        class="footer-link"
                                                    >
                                                        <Icon>
                                                            <History />
                                                        </Icon>
                                                        <span> 更新日志 </span>
                                                    </a>
                                                </p>
                                                <p class="footer-element">
                                                    <Icon>
                                                        <Clock />
                                                    </Icon>
                                                    <span>
                                                        本网站已运行
                                                        {{ timeSinceFound }} 秒
                                                    </span>
                                                </p>
                                                <p class="footer-element">
                                                    <a
                                                        href="https://github.com/laikit-dev/luogu-saver/graphs/contributors"
                                                        class="footer-link"
                                                    >
                                                        <Icon>
                                                            <Users />
                                                        </Icon>
                                                        <span> 项目贡献者 </span>
                                                    </a>
                                                </p>
                                            </n-gi>
                                            <n-gi>
                                                <p class="footer-element right-aligned">
                                                    <Icon><Code /></Icon>
                                                    <span>
                                                        开发者：Federico2903 & Murasame & quanac-lcx
                                                    </span>
                                                </p>
                                                <p class="footer-element right-aligned">
                                                    <a
                                                        href="https://qm.qq.com/q/QVM9YFEb26"
                                                        target="_blank"
                                                        class="footer-link"
                                                    >
                                                        <Icon>
                                                            <Qq />
                                                        </Icon>
                                                        <span
                                                            >洛谷保存站用户群：1017248143（点击加入）</span
                                                        >
                                                    </a>
                                                </p>
                                                <p class="footer-element right-aligned">
                                                    <a href="/privacy" class="footer-link">
                                                        <Icon>
                                                            <UserShield />
                                                        </Icon>
                                                        <span>隐私协议</span>
                                                    </a>
                                                    <a href="/disclaimer" class="footer-link">
                                                        <Icon>
                                                            <ExclamationCircle />
                                                        </Icon>
                                                        <span>免责声明</span>
                                                    </a>
                                                    <a href="/deletion" class="footer-link">
                                                        <Icon>
                                                            <TrashAlt />
                                                        </Icon>
                                                        <span>数据移除政策</span>
                                                    </a>
                                                </p>
                                                <p class="footer-element right-aligned">
                                                    <a
                                                        href="https://www.rainyun.com/MjUxMDAy_?s=saver"
                                                        target="_blank"
                                                        class="footer-link"
                                                    >
                                                        <Icon>
                                                            <Server />
                                                        </Icon>
                                                        <span>本站由雨云提供支持</span>
                                                    </a>
                                                </p>
                                            </n-gi>
                                        </n-grid>
                                    </n-layout-footer>
                                </IconConfigProvider>
                            </n-layout-content>
                        </n-layout>
                    </n-dialog-provider>
                    <TrackingConsent />
                </n-layout>
            </n-space>
        </n-message-provider>
    </n-config-provider>
</template>

<script setup lang="ts">
import { provide, ref, computed, watch } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import {
    NLayout,
    NLayoutSider,
    NLayoutContent,
    NLayoutFooter,
    NSpace,
    NMenu,
    NConfigProvider,
    type GlobalThemeOverrides,
    NGrid,
    NGi,
    type MenuOption,
    NMessageProvider,
    NBackTop,
    NDialogProvider
} from 'naive-ui';

import {
    HomeOutline,
    AppsOutline,
    SearchOutline,
    StatsChartOutline,
    GlobeOutline,
    SettingsOutline,
    ShieldCheckmarkOutline,
    ChatbubbleEllipsesOutline
} from '@vicons/ionicons5';

import { Icon, IconConfigProvider } from '@vicons/utils';

import {
    Copyright,
    Code,
    UserShield,
    ExclamationCircle,
    TrashAlt,
    Qq,
    Server,
    Github,
    Clock,
    Book,
    History,
    Users
} from '@vicons/fa';

import { renderIcon } from '@/utils/render';

import { uiThemeKey, type UiThemeVars } from '@/styles/theme/themeKeys.ts';
import { defaultTheme } from '@/styles/theme/default-theme.ts';
import TrackingConsent from '@/components/TrackingConsent.vue';
import { currentRole, isAuthenticated, setCurrentAuth } from '@/utils/auth.ts';
import { hasAnyPermission, Permission } from '@/utils/permissions.ts';
import { getCurrentUser } from '@/api/auth.ts';

// import socket from '@/utils/websocket';

// socket.joinRoom('notification');

const router = useRouter();
const route = useRoute();

const activeKey = computed(
    () => (route.meta.activeMenu as string) || (route.path as string).slice(1)
);
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

const canShowAdminMenu = computed(() =>
    hasAnyPermission(currentRole.value, [Permission.MANAGE_USERS, Permission.MANAGE_SEARCH])
);

const menuOptions = computed<MenuOption[]>(() => [
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
        label: 'RAG 问答',
        key: 'rag',
        icon: renderIcon(ChatbubbleEllipsesOutline)
    },
    // {
    //     label: '题目',
    //     key: 'problem',
    //     icon: renderIcon(ListOutline)
    // },
    {
        label: '文章广场',
        key: 'plaza',
        icon: renderIcon(GlobeOutline)
    },
    // {
    //     label: '用户动态',
    //     key: 'benben',
    //     icon: renderIcon(ShareSocialOutline),
    //     children: [
    //         {
    //             label: '被 at 查询',
    //             key: 'benben/mentions',
    //             icon: renderIcon(AtOutline)
    //         },
    //         {
    //             label: '用户历史',
    //             key: 'benben/history',
    //             icon: renderIcon(CloudCircleOutline)
    //         },
    //         {
    //             label: '用户抓取',
    //             key: 'benben/crawl',
    //             icon: renderIcon(CloudDownloadOutline)
    //         }
    //     ]
    // },
    // {
    //     label: '冬日绘板',
    //     key: 'paintboard',
    //     icon: renderIcon(BrushOutline),
    //     children: [
    //         {
    //             label: '查看绘板',
    //             key: 'paintboard/view',
    //             icon: renderIcon(ImageOutline)
    //         },
    //         {
    //             label: '申请凭据',
    //             key: 'paintboard/token',
    //             icon: renderIcon(KeyOutline)
    //         }
    //     ]
    // },
    // {
    //     label: '陶片放逐',
    //     key: 'judgement',
    //     icon: renderIcon(HammerOutline)
    // },
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
    },
    ...(canShowAdminMenu.value
        ? [
              {
                  label: '后台',
                  key: 'admin',
                  icon: renderIcon(ShieldCheckmarkOutline)
              }
          ]
        : [])
]);

import { THEME_STORAGE_KEY } from '@/utils/constants.ts';
import { useLocalStorage } from '@/composables/useLocalStorage.ts';
const themeStorage = useLocalStorage(THEME_STORAGE_KEY, defaultTheme);
const uiThemeVars = ref<UiThemeVars>(themeStorage.value);

provide(uiThemeKey, uiThemeVars);

if (isAuthenticated.value) {
    getCurrentUser()
        .then(response => {
            if (response.code === 200) setCurrentAuth(response.data);
        })
        .catch(() => {});
}

watch(
    uiThemeVars,
    newVal => {
        themeStorage.value = newVal;
        console.log('UI theme vars updated and saved to localStorage.');
    },
    { deep: true }
);

const themeOverrides = computed<GlobalThemeOverrides>(() => {
    return {
        common: {
            fontFamily: "'Lato', sans-serif",
            fontFamilyMono: "'Fira Code', monospace",
            borderRadius: uiThemeVars.value.cardRadius,
            bodyColor: uiThemeVars.value.bodyColor,
            primaryColor: uiThemeVars.value.primaryColor,
            primaryColorHover: uiThemeVars.value.primaryColorHover,
            primaryColorPressed: uiThemeVars.value.primaryColorPressed,
            primaryColorSuppl: uiThemeVars.value.primaryColorSuppl,
            cardColor: uiThemeVars.value.cardColor
        },
        Layout: {
            color: uiThemeVars.value.bodyColor,
            siderColor: 'rgba(255, 255, 255, 0.78)'
        },
        Menu: {
            itemTextColorActive: uiThemeVars.value.primaryColor,
            itemIconColorActive: uiThemeVars.value.primaryColor,
            itemColorActive: 'rgba(22, 119, 255, 0.1)',
            itemColorActiveHover: 'rgba(22, 119, 255, 0.14)',
            itemColorHover: 'rgba(22, 119, 255, 0.08)',
            borderRadius: uiThemeVars.value.cardRadius
        }
    };
});

const handleMenuSelect = (key: string) => {
    if (key === 'home') {
        router.push('/');
    } else {
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

.app-main {
    background:
        radial-gradient(circle at top left, rgba(22, 119, 255, 0.12), transparent 34vw),
        linear-gradient(180deg, #f7fbff 0%, #eef6ff 100%);
}

.app-sider {
    border-right: 1px solid rgba(22, 119, 255, 0.1) !important;
    backdrop-filter: blur(18px);
    box-shadow: 12px 0 32px rgba(15, 70, 130, 0.06);
}

.brand-shell {
    height: 72px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-bottom: 1px solid rgba(22, 119, 255, 0.08);
    background: linear-gradient(135deg, rgba(255, 255, 255, 0.76), rgba(233, 245, 255, 0.52));
}

.app-footer {
    margin-top: 28px;
    padding: 14px 40px;
    border-radius: 6px 6px 0 0;
    background: rgba(255, 255, 255, 0.72);
    backdrop-filter: blur(16px);
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
    max-width: min(1680px, 100%);
    margin: 0 auto;
    min-height: calc(100vh - 48px);
}

@media (max-width: 768px) {
    :deep(.n-layout-content) {
        padding: 16px !important;
    }

    .app-footer {
        padding: 12px 16px;
    }
}
</style>
