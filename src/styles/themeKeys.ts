import { type InjectionKey, type Ref } from 'vue';

export interface UiThemeVars {
    bodyColor: string;
    primaryColor: string;
    primaryColorHover: string;
    primaryColorPressed: string;
    primaryColorSuppl: string;
    cardColor: string;
    cardTitleColor: string;
    cardShadow: string;
    iconColor: string;
};

export const uiThemeKey = Symbol() as InjectionKey<Ref<UiThemeVars>>;