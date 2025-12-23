import { type InjectionKey, type Ref } from 'vue';

export interface UiThemeVars {
    bodyColor: string;
    textColor: string;
    primaryColor: string;
    primaryColorHover: string;
    primaryColorPressed: string;
    primaryColorSuppl: string;
    cardColor: string;
    cardTitleColor: string;
    cardShadow: string;
    iconColor: string;
    // macOS-specific additions
    sidebarColor: string;
    sidebarActiveColor: string;
    borderColor: string;
    textSecondary: string;
    vibrancyBackground: string;
};

export const uiThemeKey = Symbol() as InjectionKey<Ref<UiThemeVars>>;