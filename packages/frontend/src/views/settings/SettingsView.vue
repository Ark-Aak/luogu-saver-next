<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { NAlert, NButton, NCard, NGi, NGrid, NSpace, NSpin, NTag } from 'naive-ui';
import {
    clearAuthToken,
    isAuthenticated,
    setCurrentAuth,
    startCpOAuthLogin
} from '@/utils/auth.ts';
import { getCurrentUser, type AuthMeResponse } from '@/api/auth.ts';

const loading = ref(false);
const currentUser = ref<AuthMeResponse | null>(null);
const errorMessage = ref('');

async function loadCurrentUser() {
    if (!isAuthenticated.value) return;

    loading.value = true;
    errorMessage.value = '';
    try {
        const response = await getCurrentUser();
        if (response.code === 200) {
            currentUser.value = response.data;
            setCurrentAuth(response.data);
        } else {
            errorMessage.value = response.message;
        }
    } catch (error) {
        errorMessage.value = error instanceof Error ? error.message : '加载用户信息失败';
    } finally {
        loading.value = false;
    }
}

function handleLogout() {
    clearAuthToken();
    currentUser.value = null;
}

onMounted(loadCurrentUser);
</script>

<template>
    <div class="settings-page">
        <n-grid :x-gap="24" :y-gap="24" cols="1 m:5" responsive="screen">
            <n-gi span="1 m:3">
                <n-card title="账号设置" class="settings-card" :bordered="false">
                    <n-space vertical size="large">
                        <n-alert v-if="errorMessage" type="warning" title="账号状态">
                            {{ errorMessage }}
                        </n-alert>

                        <div v-if="loading" class="loading-state">
                            <n-spin size="small" />
                            <span>正在加载账号信息...</span>
                        </div>

                        <template v-else-if="isAuthenticated && currentUser">
                            <div class="account-row">
                                <div>
                                    <div class="account-name">
                                        {{
                                            currentUser.registeredUser?.name ||
                                            `用户 ${currentUser.uid}`
                                        }}
                                    </div>
                                    <div class="account-meta">
                                        Luogu UID:
                                        {{ currentUser.registeredUser?.luoguUid || '-' }}
                                    </div>
                                </div>
                                <n-tag type="success">已登录</n-tag>
                            </div>
                            <n-button secondary @click="handleLogout">退出登录</n-button>
                        </template>

                        <template v-else>
                            <div class="account-meta">使用 CP OAuth 登录，并绑定你的洛谷账号。</div>
                            <n-button type="primary" @click="startCpOAuthLogin('/settings')">
                                使用 CP OAuth 登录
                            </n-button>
                        </template>
                    </n-space>
                </n-card>
            </n-gi>

            <n-gi span="1 m:2">
                <div class="settings-guide">
                    <div class="guide-kicker">CP OAUTH</div>
                    <h2>统一身份入口</h2>
                    <p>
                        登录后会复用本地权限系统，后续保存、工作流等能力都通过同一个 Bearer Token
                        鉴权。
                    </p>
                </div>
            </n-gi>
        </n-grid>
    </div>
</template>

<style scoped>
.settings-page {
    max-width: 1080px;
    margin: 0 auto;
}

.settings-card,
.settings-guide {
    border-radius: 22px;
    box-shadow: 0 16px 36px rgba(22, 119, 255, 0.1);
}

.loading-state,
.account-row {
    display: flex;
    align-items: center;
    gap: 12px;
}

.account-row {
    justify-content: space-between;
}

.account-name {
    font-size: 18px;
    font-weight: 600;
}

.account-meta {
    color: #64748b;
}

.settings-guide {
    min-height: 220px;
    padding: 28px;
    color: #10233f;
    background:
        radial-gradient(circle at top right, rgba(47, 109, 181, 0.14), transparent 42%),
        linear-gradient(135deg, rgba(255, 255, 255, 0.92), rgba(226, 239, 252, 0.86));
    border: 1px solid rgba(47, 109, 181, 0.12);
}

.settings-guide h2 {
    margin: 10px 0;
    font-size: 28px;
}

.settings-guide p {
    margin: 0;
    line-height: 1.8;
    color: #64748b;
}

.guide-kicker {
    font-size: 12px;
    font-weight: 700;
    letter-spacing: 0.14em;
    color: #2f6db5;
}
</style>
