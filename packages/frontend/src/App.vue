<!--suppress ALL -->
<template>
    <n-config-provider :theme-overrides="themeOverrides">
        <n-message-provider>
            <n-space vertical>
                <n-layout has-sider :style="themeCssVars">
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
                            <n-icon class="brand-logo" :component="LuoguLogo" />
                            <span v-if="!collapsed" class="brand-text">洛谷保存站</span>
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
                                    <n-back-top :right="50" :bottom="200" />
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
                                                    <span> 2025-2026 洛谷保存站 </span>
                                                </p>
                                                <p class="footer-element">
                                                    <a
                                                        href="https://github.com/Ark-Aak/luogu-saver-next"
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
                                                        href="https://github.com/Ark-Aak/luogu-saver/graphs/contributors"
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
                                                        &
                                                        <a
                                                            href="https://github.com/Ark-Aak/luogu-saver-next/graphs/contributors"
                                                            target="_blank"
                                                            >其他贡献者</a
                                                        >
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
                                                    <router-link to="/privacy" class="footer-link">
                                                        <Icon>
                                                            <UserShield />
                                                        </Icon>
                                                        <span>隐私协议</span>
                                                    </router-link>
                                                    <router-link
                                                        to="/disclaimer"
                                                        class="footer-link"
                                                    >
                                                        <Icon>
                                                            <ExclamationCircle />
                                                        </Icon>
                                                        <span>免责声明</span>
                                                    </router-link>
                                                    <router-link to="/deletion" class="footer-link">
                                                        <Icon>
                                                            <TrashAlt />
                                                        </Icon>
                                                        <span>数据移除政策</span>
                                                    </router-link>
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
    NDialogProvider,
    NIcon
} from 'naive-ui';

import {
    HomeOutline,
    AppsOutline,
    SearchOutline,
    StatsChartOutline,
    GlobeOutline,
    SettingsOutline,
    ShieldCheckmarkOutline,
    ChatbubbleEllipsesOutline,
    CloudDownloadOutline
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
import LuoguLogo from '@/components/icons/LuoguLogo.vue';
import { currentRole, isAuthenticated, setCurrentAuth } from '@/utils/auth.ts';
import { hasAnyPermission, Permission, ROLE_ADMIN } from '@/utils/permissions.ts';
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
    hasAnyPermission(currentRole.value, [
        Permission.MANAGE_USERS,
        Permission.MANAGE_SEARCH,
        Permission.MANAGE_ANNOUNCEMENTS,
        Permission.MANAGE_DISCOVERY
    ])
);

const canShowDiscoveryMenu = computed(() => currentRole.value === ROLE_ADMIN);

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
    ...(canShowDiscoveryMenu.value
        ? [
              {
                  label: '用户文章爬取',
                  key: 'discovery/user-articles',
                  icon: renderIcon(CloudDownloadOutline)
              }
          ]
        : []),
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
const uiThemeVars = ref<UiThemeVars>({
    ...defaultTheme,
    ...(themeStorage.value as Partial<UiThemeVars>)
});

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
            cardColor: uiThemeVars.value.cardColor,
            textColor1: uiThemeVars.value.textColor,
            textColor2: uiThemeVars.value.secondaryTextColor,
            textColor3: uiThemeVars.value.mutedTextColor,
            placeholderColor: uiThemeVars.value.controlPlaceholderColor,
            dividerColor: uiThemeVars.value.borderColor,
            borderColor: uiThemeVars.value.controlBorderColor
        },
        Layout: {
            color: uiThemeVars.value.bodyColor,
            siderColor: uiThemeVars.value.translucentCardColor
        },
        Menu: {
            itemTextColorActive: uiThemeVars.value.primaryColor,
            itemIconColorActive: uiThemeVars.value.primaryColor,
            itemColorActive: uiThemeVars.value.panelColor,
            itemColorActiveHover: uiThemeVars.value.panelColor,
            itemColorHover: uiThemeVars.value.panelColor,
            borderRadius: uiThemeVars.value.cardRadius
        },
        Input: {
            color: uiThemeVars.value.controlColor,
            colorFocus: uiThemeVars.value.controlColorFocus,
            colorDisabled: uiThemeVars.value.controlColorDisabled,
            textColor: uiThemeVars.value.controlTextColor,
            textColorDisabled: uiThemeVars.value.mutedTextColor,
            placeholderColor: uiThemeVars.value.controlPlaceholderColor,
            placeholderColorDisabled: uiThemeVars.value.mutedTextColor,
            border: `1px solid ${uiThemeVars.value.controlBorderColor}`,
            borderHover: `1px solid ${uiThemeVars.value.controlBorderHoverColor}`,
            borderFocus: `1px solid ${uiThemeVars.value.controlBorderFocusColor}`,
            borderDisabled: `1px solid ${uiThemeVars.value.borderColor}`,
            boxShadowFocus: uiThemeVars.value.focusRingShadow,
            caretColor: uiThemeVars.value.primaryColor,
            iconColor: uiThemeVars.value.iconColor,
            iconColorHover: uiThemeVars.value.primaryColorHover,
            iconColorPressed: uiThemeVars.value.primaryColorPressed,
            suffixTextColor: uiThemeVars.value.secondaryTextColor
        },
        InternalSelection: {
            color: uiThemeVars.value.controlColor,
            colorActive: uiThemeVars.value.controlColorFocus,
            colorDisabled: uiThemeVars.value.controlColorDisabled,
            textColor: uiThemeVars.value.controlTextColor,
            textColorDisabled: uiThemeVars.value.mutedTextColor,
            placeholderColor: uiThemeVars.value.controlPlaceholderColor,
            placeholderColorDisabled: uiThemeVars.value.mutedTextColor,
            border: `1px solid ${uiThemeVars.value.controlBorderColor}`,
            borderHover: `1px solid ${uiThemeVars.value.controlBorderHoverColor}`,
            borderActive: `1px solid ${uiThemeVars.value.controlBorderFocusColor}`,
            borderFocus: `1px solid ${uiThemeVars.value.controlBorderFocusColor}`,
            boxShadowHover: 'none',
            boxShadowActive: uiThemeVars.value.focusRingShadow,
            boxShadowFocus: uiThemeVars.value.focusRingShadow,
            caretColor: uiThemeVars.value.primaryColor,
            arrowColor: uiThemeVars.value.iconColor,
            clearColor: uiThemeVars.value.mutedTextColor,
            clearColorHover: uiThemeVars.value.secondaryTextColor,
            clearColorPressed: uiThemeVars.value.primaryColorPressed,
            peers: {
                Popover: {
                    color: uiThemeVars.value.cardColor,
                    textColor: uiThemeVars.value.textColor,
                    dividerColor: uiThemeVars.value.borderColor,
                    boxShadow: uiThemeVars.value.elevatedShadow
                }
            }
        },
        Select: {
            menuBoxShadow: uiThemeVars.value.elevatedShadow,
            peers: {
                InternalSelection: {
                    color: uiThemeVars.value.controlColor,
                    colorActive: uiThemeVars.value.controlColorFocus,
                    textColor: uiThemeVars.value.controlTextColor,
                    placeholderColor: uiThemeVars.value.controlPlaceholderColor,
                    border: `1px solid ${uiThemeVars.value.controlBorderColor}`,
                    borderHover: `1px solid ${uiThemeVars.value.controlBorderHoverColor}`,
                    borderActive: `1px solid ${uiThemeVars.value.controlBorderFocusColor}`,
                    borderFocus: `1px solid ${uiThemeVars.value.controlBorderFocusColor}`,
                    boxShadowActive: uiThemeVars.value.focusRingShadow,
                    boxShadowFocus: uiThemeVars.value.focusRingShadow,
                    arrowColor: uiThemeVars.value.iconColor
                },
                InternalSelectMenu: {
                    color: uiThemeVars.value.cardColor,
                    optionTextColor: uiThemeVars.value.textColor,
                    optionTextColorActive: uiThemeVars.value.primaryColor,
                    optionColorPending: uiThemeVars.value.panelColor,
                    optionColorActive: uiThemeVars.value.panelColor,
                    optionColorActivePending: uiThemeVars.value.panelColor,
                    actionDividerColor: uiThemeVars.value.borderColor
                }
            }
        },
        Tag: {
            border: `1px solid ${uiThemeVars.value.controlBorderColor}`,
            color: uiThemeVars.value.controlTagColor,
            colorBordered: uiThemeVars.value.controlTagColor,
            textColor: uiThemeVars.value.controlTagTextColor,
            closeIconColor: uiThemeVars.value.iconColor,
            closeIconColorHover: uiThemeVars.value.primaryColorHover,
            closeIconColorPressed: uiThemeVars.value.primaryColorPressed,
            borderPrimary: `1px solid ${uiThemeVars.value.primaryColor}`,
            textColorPrimary: uiThemeVars.value.primaryColor,
            colorPrimary: uiThemeVars.value.controlTagColor,
            borderInfo: `1px solid ${uiThemeVars.value.infoColor}`,
            textColorInfo: uiThemeVars.value.infoColor,
            colorInfo: uiThemeVars.value.controlTagColor,
            borderSuccess: `1px solid ${uiThemeVars.value.successColor}`,
            textColorSuccess: uiThemeVars.value.successColor,
            colorSuccess: uiThemeVars.value.controlTagColor,
            borderWarning: `1px solid ${uiThemeVars.value.warningColor}`,
            textColorWarning: uiThemeVars.value.warningColor,
            colorWarning: uiThemeVars.value.controlTagColor,
            borderError: `1px solid ${uiThemeVars.value.errorColor}`,
            textColorError: uiThemeVars.value.errorColor,
            colorError: uiThemeVars.value.controlTagColor
        },
        Slider: {
            railColor: uiThemeVars.value.sliderRailColor,
            railColorHover: uiThemeVars.value.sliderRailHoverColor,
            fillColor: uiThemeVars.value.sliderFillColor,
            fillColorHover: uiThemeVars.value.sliderFillHoverColor,
            handleColor: uiThemeVars.value.sliderHandleColor,
            handleBoxShadow: `0 0 0 1px ${uiThemeVars.value.controlBorderColor}`,
            handleBoxShadowHover: `0 0 0 1px ${uiThemeVars.value.controlBorderHoverColor}`,
            handleBoxShadowActive: `0 0 0 1px ${uiThemeVars.value.controlBorderFocusColor}`,
            handleBoxShadowFocus: uiThemeVars.value.focusRingShadow,
            dotColor: uiThemeVars.value.controlColor,
            dotColorModal: uiThemeVars.value.controlColor,
            dotColorPopover: uiThemeVars.value.controlColor,
            dotBorder: `1px solid ${uiThemeVars.value.controlBorderColor}`,
            dotBorderActive: `1px solid ${uiThemeVars.value.sliderFillColor}`,
            indicatorColor: uiThemeVars.value.cardColor,
            indicatorTextColor: uiThemeVars.value.textColor,
            indicatorBoxShadow: uiThemeVars.value.elevatedShadow,
            indicatorBorderRadius: uiThemeVars.value.cardRadius
        },
        Message: {
            color: uiThemeVars.value.cardColor,
            colorInfo: uiThemeVars.value.cardColor,
            colorSuccess: uiThemeVars.value.cardColor,
            colorError: uiThemeVars.value.cardColor,
            colorWarning: uiThemeVars.value.cardColor,
            colorLoading: uiThemeVars.value.cardColor
        },
        Space: {
            gapSmall: '8px 8px',
            gapMedium: '12px 12px',
            gapLarge: '16px 16px'
        },
        Statistic: {
            labelTextColor: uiThemeVars.value.secondaryTextColor,
            valueTextColor: uiThemeVars.value.textColor,
            valuePrefixTextColor: uiThemeVars.value.textColor,
            valueSuffixTextColor: uiThemeVars.value.secondaryTextColor
        }
    };
});

const themeCssVars = computed(() => {
    const vars = uiThemeVars.value;
    return {
        '--ui-body-color': vars.bodyColor,
        '--ui-body-gradient-start': vars.bodyGradientStart,
        '--ui-body-gradient-end': vars.bodyGradientEnd,
        '--ui-primary-color': vars.primaryColor,
        '--ui-primary-color-hover': vars.primaryColorHover,
        '--ui-primary-color-pressed': vars.primaryColorPressed,
        '--ui-primary-color-suppl': vars.primaryColorSuppl,
        '--ui-card-color': vars.cardColor,
        '--ui-translucent-card-color': vars.translucentCardColor,
        '--ui-card-title-color': vars.cardTitleColor,
        '--ui-text-color': vars.textColor,
        '--ui-secondary-text-color': vars.secondaryTextColor,
        '--ui-muted-text-color': vars.mutedTextColor,
        '--ui-border-color': vars.borderColor,
        '--ui-panel-color': vars.panelColor,
        '--ui-control-color': vars.controlColor,
        '--ui-control-color-focus': vars.controlColorFocus,
        '--ui-control-color-disabled': vars.controlColorDisabled,
        '--ui-control-text-color': vars.controlTextColor,
        '--ui-control-placeholder-color': vars.controlPlaceholderColor,
        '--ui-control-border-color': vars.controlBorderColor,
        '--ui-control-border-hover-color': vars.controlBorderHoverColor,
        '--ui-control-border-focus-color': vars.controlBorderFocusColor,
        '--ui-control-tag-color': vars.controlTagColor,
        '--ui-control-tag-text-color': vars.controlTagTextColor,
        '--ui-slider-rail-color': vars.sliderRailColor,
        '--ui-slider-rail-hover-color': vars.sliderRailHoverColor,
        '--ui-slider-fill-color': vars.sliderFillColor,
        '--ui-slider-fill-hover-color': vars.sliderFillHoverColor,
        '--ui-slider-handle-color': vars.sliderHandleColor,
        '--ui-inline-code-background-color': vars.inlineCodeBackgroundColor,
        '--ui-inline-code-text-color': vars.inlineCodeTextColor,
        '--ui-mark-background-color': vars.markBackgroundColor,
        '--ui-table-header-color': vars.tableHeaderColor,
        '--ui-scrollbar-track-color': vars.scrollbarTrackColor,
        '--ui-scrollbar-thumb-color': vars.scrollbarThumbColor,
        '--ui-copy-button-background-color': vars.copyButtonBackgroundColor,
        '--ui-copy-button-text-color': vars.copyButtonTextColor,
        '--ui-footer-text-color': vars.footerTextColor,
        '--ui-link-color': vars.linkColor,
        '--ui-link-hover-color': vars.linkHoverColor,
        '--ui-info-color': vars.infoColor,
        '--ui-success-color': vars.successColor,
        '--ui-warning-color': vars.warningColor,
        '--ui-error-color': vars.errorColor,
        '--ui-orange-color': vars.orangeColor,
        '--ui-cyan-color': vars.cyanColor,
        '--ui-muted-accent-color': vars.mutedAccentColor,
        '--ui-card-shadow': vars.cardShadow,
        '--ui-elevated-shadow': vars.elevatedShadow,
        '--ui-focus-ring-shadow': vars.focusRingShadow,
        '--ui-card-radius': vars.cardRadius,
        '--ui-pill-radius': vars.pillRadius,
        '--ui-icon-color': vars.iconColor,
        '--ui-user-red-color': vars.userRedColor,
        '--ui-user-orange-color': vars.userOrangeColor,
        '--ui-user-purple-color': vars.userPurpleColor,
        '--ui-user-green-color': vars.userGreenColor,
        '--ui-user-blue-color': vars.userBlueColor,
        '--ui-user-gray-color': vars.userGrayColor,
        '--ui-user-cheater-color': vars.userCheaterColor,
        '--ui-prize-green-color': vars.prizeGreenColor,
        '--ui-prize-blue-color': vars.prizeBlueColor,
        '--ui-prize-gold-color': vars.prizeGoldColor,
        '--ui-category-personal-color': vars.categoryPersonalColor,
        '--ui-category-solution-color': vars.categorySolutionColor,
        '--ui-category-tech-color': vars.categoryTechColor,
        '--ui-category-algorithm-color': vars.categoryAlgorithmColor,
        '--ui-category-life-color': vars.categoryLifeColor,
        '--ui-category-study-color': vars.categoryStudyColor,
        '--ui-category-fun-color': vars.categoryFunColor,
        '--ui-category-chat-color': vars.categoryChatColor,
        '--ui-category-unknown-color': vars.categoryUnknownColor
    };
});

watch(
    themeCssVars,
    vars => {
        Object.entries(vars).forEach(([key, value]) => {
            document.documentElement.style.setProperty(key, value);
        });
    },
    { immediate: true }
);

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
        radial-gradient(circle at top left, var(--ui-panel-color), transparent 34vw),
        linear-gradient(180deg, var(--ui-body-gradient-start) 0%, var(--ui-body-gradient-end) 100%);
}

.app-sider {
    border-right: 1px solid var(--ui-border-color) !important;
    backdrop-filter: blur(18px);
    box-shadow: var(--ui-card-shadow);
}

.brand-shell {
    height: 72px;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    border-bottom: 1px solid var(--ui-border-color);
    background: var(--ui-translucent-card-color);
}

.brand-logo {
    color: var(--ui-icon-color);
    font-size: 32px;
    flex-shrink: 0;
}

.brand-text {
    color: var(--ui-card-title-color);
    font-size: 18px;
    font-weight: 700;
    letter-spacing: 0.02em;
    white-space: nowrap;
}

.app-footer {
    margin: 28px -28px -28px -28px;
    padding: 14px 40px;
    background: var(--ui-translucent-card-color);
    color: var(--ui-footer-text-color);
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
    color: var(--ui-footer-text-color);
    transition: color 0.2s;
    text-decoration: none;
}
.footer-link:hover {
    color: var(--ui-link-hover-color) !important;
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
