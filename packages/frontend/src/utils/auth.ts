import { computed, ref } from 'vue';
import { useLocalStorage } from '@/composables/useLocalStorage.ts';
import { AUTH_TOKEN_STORAGE_KEY } from '@/utils/constants.ts';
import { getApiUrl } from '@/utils/api-base-url.ts';
import type { AuthMeResponse } from '@/api/auth.ts';

const tokenStorage = useLocalStorage(AUTH_TOKEN_STORAGE_KEY, '');

export const authToken = tokenStorage;
export const currentAuth = ref<AuthMeResponse | null>(null);

export const isAuthenticated = computed(() => Boolean(authToken.value));
export const currentRole = computed(() => currentAuth.value?.role ?? null);

export function setAuthToken(token: string) {
    authToken.value = token;
}

export function clearAuthToken() {
    authToken.value = '';
    currentAuth.value = null;
}

export function setCurrentAuth(auth: AuthMeResponse | null) {
    currentAuth.value = auth;
}

export function startCpOAuthLogin(redirect: string = window.location.pathname) {
    window.location.href = getApiUrl(`/auth/cp/login?redirect=${encodeURIComponent(redirect)}`);
}
