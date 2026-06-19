import { computed, type Ref } from 'vue';
import { useLocalStorage } from '@/composables/useLocalStorage.ts';
import { LUOGU_SOURCE_STORAGE_KEY } from '@/utils/constants.ts';

export type LuoguSourceHost = 'luogu.com' | 'luogu.com.cn';

export const DEFAULT_LUOGU_SOURCE_HOST: LuoguSourceHost = 'luogu.com';

export const LUOGU_SOURCE_OPTIONS: Array<{ label: string; value: LuoguSourceHost }> = [
    { label: 'luogu.com', value: 'luogu.com' },
    { label: 'luogu.com.cn', value: 'luogu.com.cn' }
];

let sourceStorage: Ref<LuoguSourceHost | null> | null = null;

function isLuoguSourceHost(value: unknown): value is LuoguSourceHost {
    return value === 'luogu.com' || value === 'luogu.com.cn';
}

export function useLuoguSource() {
    sourceStorage ??= useLocalStorage<LuoguSourceHost>(
        LUOGU_SOURCE_STORAGE_KEY,
        DEFAULT_LUOGU_SOURCE_HOST
    );

    const selectedSource = computed<LuoguSourceHost>({
        get: () => {
            if (isLuoguSourceHost(sourceStorage!.value)) return sourceStorage!.value;
            return DEFAULT_LUOGU_SOURCE_HOST;
        },
        set: value => {
            sourceStorage!.value = isLuoguSourceHost(value) ? value : DEFAULT_LUOGU_SOURCE_HOST;
        }
    });

    const sourceBaseUrl = computed(() => `https://www.${selectedSource.value}`);

    const buildLuoguUrl = (path: string) => {
        const normalizedPath = path.startsWith('/') ? path : `/${path}`;
        return `${sourceBaseUrl.value}${normalizedPath}`;
    };

    return {
        selectedSource,
        sourceBaseUrl,
        sourceOptions: LUOGU_SOURCE_OPTIONS,
        buildLuoguUrl
    };
}
