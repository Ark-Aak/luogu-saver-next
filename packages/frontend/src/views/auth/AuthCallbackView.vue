<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { NAlert, NButton, NSpin } from 'naive-ui';
import { setAuthToken } from '@/utils/auth.ts';

const route = useRoute();
const router = useRouter();
const errorMessage = ref('');

onMounted(() => {
    const error = route.query.error as string | undefined;
    if (error) {
        errorMessage.value = (route.query.message as string | undefined) || error;
        return;
    }

    const token = route.query.token as string | undefined;
    if (!token) {
        errorMessage.value = '登录回调缺少 token';
        return;
    }

    setAuthToken(token);
    const redirect = (route.query.redirect as string | undefined) || '/';
    router.replace(redirect.startsWith('/') && !redirect.startsWith('//') ? redirect : '/');
});
</script>

<template>
    <div class="auth-callback">
        <n-alert v-if="errorMessage" type="error" title="登录失败">
            {{ errorMessage }}
            <template #action>
                <n-button size="small" @click="router.replace('/')">返回首页</n-button>
            </template>
        </n-alert>
        <div v-else class="loading-state">
            <n-spin size="small" />
            <span>正在完成登录...</span>
        </div>
    </div>
</template>

<style scoped>
.auth-callback {
    max-width: 640px;
    margin: 80px auto;
}

.loading-state {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 12px;
    color: var(--ui-secondary-text-color);
}
</style>
