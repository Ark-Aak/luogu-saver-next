<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import {
    NAlert,
    NButton,
    NDescriptions,
    NDescriptionsItem,
    NIcon,
    NSpace,
    NSpin,
    NSwitch,
    NTag,
    useMessage
} from 'naive-ui';
import {
    AnalyticsOutline,
    CheckmarkCircleOutline,
    CloudOutline,
    KeyOutline,
    RefreshOutline,
    SettingsOutline,
    TrashOutline
} from '@vicons/ionicons5';
import Card from '@/components/Card.vue';
import CardTitle from '@/components/CardTitle.vue';
import {
    clearAuthToken,
    isAuthenticated,
    setCurrentAuth,
    startCpOAuthLogin
} from '@/utils/auth.ts';
import { getCurrentUser, type AuthMeResponse } from '@/api/auth.ts';
import {
    AUTH_TOKEN_STORAGE_KEY,
    CACHE_STORAGE_KEY,
    CONSENT_TRACKING_STORAGE_KEY,
    DEVICE_ID_STORAGE_KEY
} from '@/utils/constants.ts';
import { useLocalStorage } from '@/composables/useLocalStorage.ts';
import { getDeviceId } from '@/utils/device-id.ts';
import { API_BASE_URL } from '@/utils/api-base-url.ts';
import { formatDate } from '@/utils/render.ts';

const message = useMessage();
const loading = ref(false);
const currentUser = ref<AuthMeResponse | null>(null);
const errorMessage = ref('');
const trackingStorage = useLocalStorage(CONSENT_TRACKING_STORAGE_KEY, 'denied');

const trackingEnabled = computed({
    get: () => trackingStorage.value === 'allowed',
    set: value => {
        trackingStorage.value = value ? 'allowed' : 'denied';
        message.success(value ? '数据追踪已开启' : '数据追踪已关闭');
    }
});

const deviceId = computed(() => localStorage.getItem(DEVICE_ID_STORAGE_KEY) || '未生成');
const authStatus = computed(() => (isAuthenticated.value ? '已登录' : '未登录'));
const authTagType = computed(() => (isAuthenticated.value ? 'success' : 'default'));
const registeredUser = computed(() => currentUser.value?.registeredUser || null);

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
    message.success('已退出登录');
}

function resetDeviceId() {
    localStorage.removeItem(DEVICE_ID_STORAGE_KEY);
    if (trackingEnabled.value) getDeviceId();
    message.success('设备 ID 已重置');
}

function clearSaveCache() {
    let count = 0;
    for (const key of Object.keys(localStorage)) {
        if (key.startsWith(CACHE_STORAGE_KEY)) {
            localStorage.removeItem(key);
            count += 1;
        }
    }
    message.success(count ? `已清理 ${count} 项保存缓存` : '没有可清理的保存缓存');
}

async function copyText(text: string, successText: string) {
    try {
        await navigator.clipboard.writeText(text);
        message.success(successText);
    } catch {
        message.error('复制失败');
    }
}

onMounted(loadCurrentUser);
</script>

<template>
    <div class="settings-page">
        <CardTitle title="设置" :icon="SettingsOutline" chip="PREFERENCES">
            ACCOUNT AND LOCAL SETTINGS
        </CardTitle>

        <div class="settings-grid">
            <Card title="账号" :icon="KeyOutline" class="settings-card">
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
                                    {{ registeredUser?.name || `用户 ${currentUser.uid}` }}
                                </div>
                                <div class="account-meta">
                                    Luogu UID: {{ registeredUser?.luoguUid || '-' }}
                                </div>
                            </div>
                            <n-tag :type="authTagType">{{ authStatus }}</n-tag>
                        </div>

                        <n-descriptions label-placement="left" :column="1" size="small">
                            <n-descriptions-item label="权限值">
                                {{ currentUser.role }}
                            </n-descriptions-item>
                            <n-descriptions-item label="绑定时间">
                                {{
                                    registeredUser?.createdAt
                                        ? formatDate(registeredUser.createdAt)
                                        : '-'
                                }}
                            </n-descriptions-item>
                        </n-descriptions>

                        <n-space>
                            <n-button secondary @click="loadCurrentUser">
                                <template #icon>
                                    <n-icon :component="RefreshOutline" />
                                </template>
                                刷新账号信息
                            </n-button>
                            <n-button secondary type="error" @click="handleLogout"
                                >退出登录</n-button
                            >
                        </n-space>
                    </template>

                    <template v-else>
                        <div class="account-meta">使用 CP OAuth 登录，并绑定你的洛谷账号。</div>
                        <n-button type="primary" @click="startCpOAuthLogin('/settings')">
                            使用 CP OAuth 登录
                        </n-button>
                    </template>
                </n-space>
            </Card>

            <Card title="隐私与数据追踪" :icon="AnalyticsOutline" class="settings-card">
                <n-space vertical size="large">
                    <div class="setting-row">
                        <div>
                            <div class="setting-title">允许匿名数据追踪</div>
                            <div class="setting-desc">
                                开启后用于匿名推荐；关闭后后续请求不会发送设备 ID。
                            </div>
                        </div>
                        <n-switch v-model:value="trackingEnabled" />
                    </div>

                    <n-descriptions label-placement="left" :column="1" size="small">
                        <n-descriptions-item label="状态">
                            <n-tag :type="trackingEnabled ? 'success' : 'default'">
                                {{ trackingEnabled ? '已开启' : '已关闭' }}
                            </n-tag>
                        </n-descriptions-item>
                        <n-descriptions-item label="设备 ID">
                            <span class="mono-text">{{ deviceId }}</span>
                        </n-descriptions-item>
                    </n-descriptions>

                    <n-space>
                        <n-button secondary @click="resetDeviceId">重置设备 ID</n-button>
                        <n-button
                            secondary
                            :disabled="deviceId === '未生成'"
                            @click="copyText(deviceId, '设备 ID 已复制')"
                        >
                            复制设备 ID
                        </n-button>
                    </n-space>
                </n-space>
            </Card>

            <Card title="本地数据" :icon="TrashOutline" class="settings-card">
                <n-space vertical size="large">
                    <div class="setting-row">
                        <div>
                            <div class="setting-title">保存缓存</div>
                            <div class="setting-desc">
                                清理文章自动更新与保存相关的本地时间戳缓存。
                            </div>
                        </div>
                        <n-button secondary type="warning" @click="clearSaveCache">
                            清理缓存
                        </n-button>
                    </div>

                    <div class="setting-row">
                        <div>
                            <div class="setting-title">登录 Token</div>
                            <div class="setting-desc">本地存储键：{{ AUTH_TOKEN_STORAGE_KEY }}</div>
                        </div>
                        <n-tag :type="isAuthenticated ? 'success' : 'default'">
                            {{ isAuthenticated ? '存在' : '不存在' }}
                        </n-tag>
                    </div>
                </n-space>
            </Card>

            <Card title="连接信息" :icon="CloudOutline" class="settings-card">
                <n-space vertical size="large">
                    <n-descriptions label-placement="left" :column="1" size="small">
                        <n-descriptions-item label="API 地址">
                            <span class="mono-text">{{ API_BASE_URL }}</span>
                        </n-descriptions-item>
                        <n-descriptions-item label="当前页面">
                            <span class="mono-text">{{ window.location.pathname }}</span>
                        </n-descriptions-item>
                    </n-descriptions>

                    <n-space>
                        <n-button secondary @click="copyText(API_BASE_URL, 'API 地址已复制')">
                            复制 API 地址
                        </n-button>
                        <n-button
                            secondary
                            @click="copyText(window.location.href, '当前页面地址已复制')"
                        >
                            复制当前地址
                        </n-button>
                    </n-space>
                </n-space>
            </Card>

            <Card
                title="状态检查"
                :icon="CheckmarkCircleOutline"
                class="settings-card compact-card"
            >
                <div class="status-list">
                    <div class="status-item">
                        <span>账号</span>
                        <n-tag :type="authTagType">{{ authStatus }}</n-tag>
                    </div>
                    <div class="status-item">
                        <span>数据追踪</span>
                        <n-tag :type="trackingEnabled ? 'success' : 'default'">
                            {{ trackingEnabled ? '开启' : '关闭' }}
                        </n-tag>
                    </div>
                    <div class="status-item">
                        <span>API</span>
                        <n-tag type="info">{{ API_BASE_URL }}</n-tag>
                    </div>
                </div>
            </Card>
        </div>
    </div>
</template>

<style scoped>
.settings-page {
    max-width: 1180px;
    margin: 0 auto;
}

.settings-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 16px;
    margin-top: 16px;
}

.settings-card {
    min-height: 100%;
}

.compact-card {
    grid-column: 1 / -1;
}

.loading-state,
.account-row,
.setting-row,
.status-item {
    display: flex;
    align-items: center;
    gap: 12px;
}

.account-row,
.setting-row,
.status-item {
    justify-content: space-between;
}

.account-name,
.setting-title {
    font-size: 16px;
    font-weight: 600;
    color: #10233f;
}

.account-meta,
.setting-desc {
    color: #64748b;
    line-height: 1.6;
}

.mono-text {
    font-family: 'Fira Code', monospace;
    font-size: 12px;
    color: #334155;
    word-break: break-all;
}

.status-list {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 12px;
}

.status-item {
    padding: 10px 12px;
    border: 1px solid rgba(47, 109, 181, 0.1);
    border-radius: 6px;
    background: rgba(248, 251, 255, 0.78);
}

@media (max-width: 900px) {
    .settings-grid,
    .status-list {
        grid-template-columns: minmax(0, 1fr);
    }

    .setting-row,
    .status-item,
    .account-row {
        align-items: flex-start;
        flex-direction: column;
    }
}
</style>
