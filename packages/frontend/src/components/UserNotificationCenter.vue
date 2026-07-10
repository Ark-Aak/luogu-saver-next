<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import {
    NBadge,
    NButton,
    NDrawer,
    NDrawerContent,
    NEmpty,
    NIcon,
    NSpin,
    useMessage
} from 'naive-ui';
import { NotificationsOutline } from '@vicons/ionicons5';
import {
    getUnreadNotificationCount,
    getUserNotifications,
    markAllUserNotificationsRead,
    markUserNotificationsRead,
    type UserNotificationItem
} from '@/api/user-notification';
import { authToken, isAuthenticated } from '@/utils/auth';
import { formatDate } from '@/utils/render';

const UNREAD_POLL_INTERVAL_MS = 120_000;

const message = useMessage();

const drawerVisible = ref(false);
const notifications = ref<UserNotificationItem[]>([]);
const unreadCount = ref(0);
const total = ref(0);
const page = ref(1);
const pageSize = 20;
const loading = ref(false);
const markingAll = ref(false);
let pollTimer: ReturnType<typeof setInterval> | null = null;

const hasMore = computed(() => notifications.value.length < total.value);

const drawerWidth = computed(() => Math.min(420, window.innerWidth - 32));

async function refreshUnreadCount() {
    if (!isAuthenticated.value) return;
    const response = await getUnreadNotificationCount().catch(() => null);
    if (response?.code === 200) unreadCount.value = response.data.count;
}

async function loadNotifications(reset = true) {
    if (!isAuthenticated.value || loading.value) return;
    loading.value = true;
    try {
        const nextPage = reset ? 1 : page.value + 1;
        const response = await getUserNotifications(nextPage, pageSize);
        if (response.code !== 200) {
            message.error(response.message);
            return;
        }
        page.value = response.data.page;
        total.value = response.data.total;
        unreadCount.value = response.data.unreadCount;
        notifications.value = reset
            ? response.data.notifications
            : [...notifications.value, ...response.data.notifications];
    } finally {
        loading.value = false;
    }
}

function openDrawer() {
    drawerVisible.value = true;
    void loadNotifications(true);
}

async function handleItemClick(item: UserNotificationItem) {
    if (item.read) return;
    const response = await markUserNotificationsRead([item.id]).catch(() => null);
    if (response?.code === 200) {
        item.read = true;
        unreadCount.value = Math.max(0, unreadCount.value - 1);
    }
}

async function handleMarkAllRead() {
    markingAll.value = true;
    try {
        const response = await markAllUserNotificationsRead();
        if (response.code === 200) {
            notifications.value.forEach(item => {
                item.read = true;
            });
            unreadCount.value = 0;
            message.success('已全部标为已读');
        } else {
            message.error(response.message);
        }
    } finally {
        markingAll.value = false;
    }
}

function startPolling() {
    stopPolling();
    if (!isAuthenticated.value) return;
    void refreshUnreadCount();
    pollTimer = setInterval(() => void refreshUnreadCount(), UNREAD_POLL_INTERVAL_MS);
}

function stopPolling() {
    if (pollTimer !== null) {
        clearInterval(pollTimer);
        pollTimer = null;
    }
}

watch(authToken, () => {
    notifications.value = [];
    unreadCount.value = 0;
    total.value = 0;
    startPolling();
});

onMounted(() => {
    startPolling();
});

onBeforeUnmount(() => {
    stopPolling();
});
</script>

<template>
    <template v-if="isAuthenticated">
        <div class="notification-bell-shell">
            <n-badge :value="unreadCount" :max="99" :show="unreadCount > 0">
                <n-button
                    circle
                    secondary
                    class="notification-bell"
                    aria-label="站内通知"
                    @click="openDrawer"
                >
                    <template #icon>
                        <n-icon :component="NotificationsOutline" />
                    </template>
                </n-button>
            </n-badge>
        </div>

        <n-drawer v-model:show="drawerVisible" :width="drawerWidth">
            <n-drawer-content title="站内通知" closable>
                <template #footer>
                    <div class="drawer-footer">
                        <n-button
                            size="small"
                            secondary
                            :disabled="unreadCount === 0"
                            :loading="markingAll"
                            @click="handleMarkAllRead"
                        >
                            全部已读
                        </n-button>
                        <n-button size="small" secondary @click="loadNotifications(true)">
                            刷新
                        </n-button>
                    </div>
                </template>

                <n-spin :show="loading">
                    <n-empty
                        v-if="notifications.length === 0"
                        description="暂无通知"
                        class="empty-state"
                    />
                    <div v-else class="notification-list">
                        <div
                            v-for="item in notifications"
                            :key="item.id"
                            class="notification-item"
                            :class="{ unread: !item.read }"
                            @click="handleItemClick(item)"
                        >
                            <div class="item-header">
                                <span class="item-title">{{ item.title }}</span>
                                <span v-if="!item.read" class="unread-dot"></span>
                            </div>
                            <p v-if="item.content" class="item-content">{{ item.content }}</p>
                            <div class="item-time">{{ formatDate(item.createdAt) }}</div>
                        </div>

                        <n-button
                            v-if="hasMore"
                            class="load-more"
                            size="small"
                            secondary
                            block
                            :loading="loading"
                            @click="loadNotifications(false)"
                        >
                            加载更多
                        </n-button>
                    </div>
                </n-spin>
            </n-drawer-content>
        </n-drawer>
    </template>
</template>

<style scoped>
.notification-bell-shell {
    position: fixed;
    top: 20px;
    right: 24px;
    z-index: 1100;
}

.notification-bell {
    box-shadow: var(--ui-elevated-shadow);
}

.empty-state {
    margin-top: 48px;
}

.notification-list {
    display: flex;
    flex-direction: column;
    gap: 10px;
}

.notification-item {
    padding: 12px 14px;
    border: 1px solid var(--ui-border-color);
    border-radius: var(--ui-card-radius);
    background: var(--ui-card-color);
    cursor: default;
    transition: background-color 0.2s ease;
}

.notification-item.unread {
    cursor: pointer;
    background: var(--ui-panel-color);
}

.item-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
}

.item-title {
    font-weight: 600;
    color: var(--ui-card-title-color);
}

.unread-dot {
    flex: 0 0 auto;
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--ui-primary-color);
}

.item-content {
    margin: 6px 0 0;
    color: var(--ui-secondary-text-color);
    font-size: 13px;
    line-height: 1.6;
    white-space: pre-wrap;
    word-break: break-word;
}

.item-time {
    margin-top: 6px;
    color: var(--ui-muted-text-color);
    font-size: 12px;
}

.load-more {
    margin-top: 4px;
}
</style>
