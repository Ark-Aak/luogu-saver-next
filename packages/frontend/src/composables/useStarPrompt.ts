import { readonly } from 'vue';
import { useLocalStorage } from '@/composables/useLocalStorage.ts';
import { GITHUB_STAR_PROMPT_STORAGE_KEY } from '@/utils/constants.ts';

export type StarPromptState = 'idle' | 'eligible' | 'opened' | 'dismissed';

const validStates = new Set<StarPromptState>(['idle', 'eligible', 'opened', 'dismissed']);
const promptState = useLocalStorage<StarPromptState>(GITHUB_STAR_PROMPT_STORAGE_KEY, 'idle');

function normalizeState(value: unknown): StarPromptState {
    return typeof value === 'string' && validStates.has(value as StarPromptState)
        ? (value as StarPromptState)
        : 'idle';
}

function parseStoredState(value: string | null): StarPromptState {
    if (value === null) return 'idle';
    try {
        return normalizeState(JSON.parse(value));
    } catch {
        return normalizeState(value);
    }
}

promptState.value = normalizeState(promptState.value);

export function markStarPromptEligible() {
    if (promptState.value === 'idle') {
        promptState.value = 'eligible';
    }
}

export function useStarPrompt() {
    const markOpened = () => {
        promptState.value = 'opened';
    };

    const dismiss = () => {
        promptState.value = 'dismissed';
    };

    const syncStoredState = (value: string | null) => {
        promptState.value = parseStoredState(value);
    };

    return {
        state: readonly(promptState),
        markOpened,
        dismiss,
        syncStoredState
    };
}
