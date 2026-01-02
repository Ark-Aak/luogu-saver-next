import { h, type Component } from 'vue';
import { NIcon } from 'naive-ui';

/**
 * 专门用于 Naive UI 菜单等组件渲染图标的辅助函数
 * @param icon - 要渲染的图标组件 (例如 HomeOutline)
 */
export function renderIcon(icon: Component) {
    return () => h(NIcon, null, { default: () => h(icon) });
}

/**
 * 将一个 HEX 颜色代码（支持 3, 4, 6, 8 位）转换为 RGBA 格式。
 * * @param hex - HEX 颜色字符串 (例如: "#FFF", "#FF0000", "#FF000080")。
 * @param hex
 * @param alphaOverride - 可选，强制指定一个 Alpha 值 (0 到 1)。如果提供，它将覆盖 HEX 中自带的 Alpha 值。
 * @returns RGBA 格式的字符串 (例如: "rgba(255, 0, 0, 0.5)")。
 * @throws 如果输入的 HEX 格式无效，则抛出错误。
 */
export function hexToRgba(hex: string, alphaOverride?: number): string {
    if (!/^#([A-Fa-f0-9]{3,4}|[A-Fa-f0-9]{6}|[A-Fa-f0-9]{8})$/.test(hex)) {
        throw new Error(`Invalid HEX color format: ${hex}`);
    }

    let hexValue = hex.substring(1);

    if (hexValue.length === 3 || hexValue.length === 4) {
        hexValue = hexValue
            .split('')
            .map(char => char + char)
            .join('');
    }

    const r = parseInt(hexValue.substring(0, 2), 16);
    const g = parseInt(hexValue.substring(2, 4), 16);
    const b = parseInt(hexValue.substring(4, 6), 16);

    let a = 1.0;

    if (typeof alphaOverride === 'number') {
        a = Math.max(0, Math.min(1, alphaOverride));
    } else if (hexValue.length === 8) {
        const alphaHex = parseInt(hexValue.substring(6, 8), 16);
        a = Math.round((alphaHex / 255) * 1000) / 1000;
    }

    return `rgba(${r}, ${g}, ${b}, ${a})`;
}

export const formatDate = (timestamp: string) => {
    return new Date(timestamp).toLocaleString('zh-CN', { hour12: false });
};
