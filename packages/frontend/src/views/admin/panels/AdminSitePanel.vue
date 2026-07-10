<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import {
    NAlert,
    NButton,
    NFormItem,
    NInput,
    NSpace,
    NSpin,
    NSwitch,
    NTag,
    useMessage
} from 'naive-ui';
import Card from '@/components/Card.vue';
import HtmlCodeEditor from '@/components/HtmlCodeEditor.vue';
import {
    getAdminAnnouncement,
    getAdminNotifications,
    updateAdminAnnouncement,
    updateAdminNotifications,
    type AdminSiteNotification
} from '@/api/admin.ts';
import type { NotificationChannel } from '@/api/notification.ts';
import { currentAuth } from '@/utils/auth.ts';
import { hasPermission, Permission } from '@/utils/permissions.ts';

const message = useMessage();

const loadingAnnouncement = ref(false);
const savingAnnouncement = ref(false);
const loadingNotifications = ref(false);
const savingNotifications = ref(false);
const announcementForm = ref({
    title: '公告',
    content: '',
    enabled: true
});

type NotificationDraft = AdminSiteNotification & { localId: string };
const notificationDrafts = ref<NotificationDraft[]>([]);
let nextNotificationDraftId = 0;

const canManageAnnouncements = computed(() =>
    hasPermission(currentAuth.value?.role, Permission.MANAGE_ANNOUNCEMENTS)
);
const bannerNotificationDrafts = computed(() => getNotificationDraftsByChannel('banner'));
const popupNotificationDrafts = computed(() => getNotificationDraftsByChannel('popup'));

async function loadAnnouncement() {
    if (!canManageAnnouncements.value) return;
    loadingAnnouncement.value = true;
    try {
        const response = await getAdminAnnouncement();
        if (response.code === 200) {
            announcementForm.value = {
                title: response.data.title,
                content: response.data.content,
                enabled: response.data.enabled
            };
        } else {
            message.error(response.message);
        }
    } finally {
        loadingAnnouncement.value = false;
    }
}

async function loadNotifications() {
    if (!canManageAnnouncements.value) return;
    loadingNotifications.value = true;
    try {
        const response = await getAdminNotifications();
        if (response.code === 200) {
            notificationDrafts.value = response.data.notifications.map(toNotificationDraft);
        } else {
            message.error(response.message);
        }
    } finally {
        loadingNotifications.value = false;
    }
}

function getNotificationDraftsByChannel(channel: NotificationChannel) {
    return notificationDrafts.value
        .filter(item => item.channel === channel)
        .sort((a, b) => a.sortOrder - b.sortOrder || getDraftStableId(a) - getDraftStableId(b));
}

function getDraftStableId(item: NotificationDraft) {
    return item.id ?? Number(item.localId.replace('draft-', ''));
}

function toNotificationDraft(item: AdminSiteNotification): NotificationDraft {
    return {
        ...item,
        content: item.content ?? '',
        localId: `draft-${++nextNotificationDraftId}`
    };
}

function createNotificationDraft(channel: NotificationChannel): NotificationDraft {
    const channelItems = getNotificationDraftsByChannel(channel);
    return {
        localId: `draft-${++nextNotificationDraftId}`,
        channel,
        title: channel === 'banner' ? 'Banner 通知' : 'Popup 通知',
        content: '',
        enabled: true,
        loginOnly: false,
        sortOrder: channelItems.length * 10
    };
}

function addNotification(channel: NotificationChannel) {
    notificationDrafts.value.push(createNotificationDraft(channel));
    renumberNotificationOrder(channel);
}

function removeNotification(localId: string) {
    const item = notificationDrafts.value.find(draft => draft.localId === localId);
    notificationDrafts.value = notificationDrafts.value.filter(draft => draft.localId !== localId);
    if (item) renumberNotificationOrder(item.channel);
}

function moveNotification(localId: string, direction: -1 | 1) {
    const item = notificationDrafts.value.find(draft => draft.localId === localId);
    if (!item) return;

    const channelItems = getNotificationDraftsByChannel(item.channel);
    const index = channelItems.findIndex(draft => draft.localId === localId);
    const swap = channelItems[index + direction];
    if (!swap) return;

    const sortOrder = item.sortOrder;
    item.sortOrder = swap.sortOrder;
    swap.sortOrder = sortOrder;
    renumberNotificationOrder(item.channel);
}

function renumberNotificationOrder(channel: NotificationChannel) {
    getNotificationDraftsByChannel(channel).forEach((item, index) => {
        item.sortOrder = index * 10;
    });
}

function buildNotificationPayload() {
    renumberNotificationOrder('banner');
    renumberNotificationOrder('popup');
    return notificationDrafts.value.map(item => ({
        id: item.id,
        channel: item.channel,
        title: item.title,
        content: item.content,
        enabled: item.enabled,
        loginOnly: item.loginOnly,
        sortOrder: item.sortOrder
    }));
}

async function handleAnnouncementSave() {
    if (!canManageAnnouncements.value) return;
    savingAnnouncement.value = true;
    try {
        const response = await updateAdminAnnouncement(announcementForm.value);
        if (response.code === 200) {
            announcementForm.value = {
                title: response.data.title,
                content: response.data.content,
                enabled: response.data.enabled
            };
            message.success('公告已保存');
        } else {
            message.error(response.message);
        }
    } finally {
        savingAnnouncement.value = false;
    }
}

async function handleNotificationsSave() {
    if (!canManageAnnouncements.value) return;
    savingNotifications.value = true;
    try {
        const response = await updateAdminNotifications(buildNotificationPayload());
        if (response.code === 200) {
            notificationDrafts.value = response.data.notifications.map(toNotificationDraft);
            message.success('通知配置已保存');
        } else {
            message.error(response.message);
        }
    } finally {
        savingNotifications.value = false;
    }
}

onMounted(async () => {
    await Promise.all([loadAnnouncement(), loadNotifications()]);
});
</script>

<template>
    <div>
        <Card title="公告管理" class="announcement-card">
            <n-spin :show="loadingAnnouncement">
                <n-space v-if="canManageAnnouncements" vertical size="large">
                    <n-space align="center" justify="space-between" class="announcement-toolbar">
                        <n-form-item
                            label="标题"
                            label-placement="left"
                            :show-feedback="false"
                            class="announcement-title-field"
                        >
                            <n-input v-model:value="announcementForm.title" />
                        </n-form-item>
                        <n-form-item
                            label="启用"
                            label-placement="left"
                            :show-feedback="false"
                            class="announcement-enabled-field"
                        >
                            <n-switch v-model:value="announcementForm.enabled" />
                        </n-form-item>
                    </n-space>

                    <HtmlCodeEditor v-model:value="announcementForm.content" />

                    <div class="announcement-preview-shell">
                        <div class="muted">预览</div>
                        <div class="announcement-preview" v-html="announcementForm.content"></div>
                    </div>

                    <n-space justify="end">
                        <n-button
                            type="primary"
                            :loading="savingAnnouncement"
                            @click="handleAnnouncementSave"
                        >
                            保存公告
                        </n-button>
                    </n-space>
                </n-space>
                <n-alert v-else type="warning" title="缺少 MANAGE_ANNOUNCEMENTS">
                    你没有公告管理权限。
                </n-alert>
            </n-spin>
        </Card>

        <Card title="通知管理" class="announcement-card">
            <n-spin :show="loadingNotifications">
                <n-space v-if="canManageAnnouncements" vertical size="large">
                    <section class="notification-editor-section">
                        <div class="notification-editor-heading">
                            <div>
                                <strong>顶部 Banner</strong>
                                <p class="muted">显示在页面内容顶部，可被用户关闭。</p>
                            </div>
                            <n-button secondary @click="addNotification('banner')">
                                新增 Banner
                            </n-button>
                        </div>

                        <n-alert
                            v-if="bannerNotificationDrafts.length === 0"
                            type="info"
                            title="暂无 Banner"
                        >
                            当前没有顶部 Banner 通知。
                        </n-alert>

                        <div
                            v-for="(item, index) in bannerNotificationDrafts"
                            :key="item.localId"
                            class="notification-item-editor"
                        >
                            <div class="notification-item-toolbar">
                                <n-space align="center">
                                    <n-tag type="info">Banner #{{ index + 1 }}</n-tag>
                                    <n-form-item
                                        label="启用"
                                        label-placement="left"
                                        :show-feedback="false"
                                        class="announcement-enabled-field"
                                    >
                                        <n-switch v-model:value="item.enabled" />
                                    </n-form-item>
                                    <n-form-item
                                        label="仅登录可见"
                                        label-placement="left"
                                        :show-feedback="false"
                                        class="announcement-enabled-field"
                                    >
                                        <n-switch v-model:value="item.loginOnly" />
                                    </n-form-item>
                                </n-space>
                                <n-space>
                                    <n-button
                                        size="small"
                                        :disabled="index === 0"
                                        @click="moveNotification(item.localId, -1)"
                                    >
                                        上移
                                    </n-button>
                                    <n-button
                                        size="small"
                                        :disabled="index === bannerNotificationDrafts.length - 1"
                                        @click="moveNotification(item.localId, 1)"
                                    >
                                        下移
                                    </n-button>
                                    <n-button
                                        size="small"
                                        type="error"
                                        secondary
                                        @click="removeNotification(item.localId)"
                                    >
                                        删除
                                    </n-button>
                                </n-space>
                            </div>

                            <n-form-item label="标题" :show-feedback="false">
                                <n-input v-model:value="item.title" />
                            </n-form-item>

                            <HtmlCodeEditor v-model:value="item.content" />

                            <div class="announcement-preview-shell">
                                <div class="muted">Banner 预览</div>
                                <div class="announcement-preview" v-html="item.content"></div>
                            </div>
                        </div>
                    </section>

                    <section class="notification-editor-section">
                        <div class="notification-editor-heading">
                            <div>
                                <strong>Popup 弹窗</strong>
                                <p class="muted">页面加载后弹出，可选择仅对登录用户显示。</p>
                            </div>
                            <n-button secondary @click="addNotification('popup')">
                                新增 Popup
                            </n-button>
                        </div>

                        <n-alert
                            v-if="popupNotificationDrafts.length === 0"
                            type="info"
                            title="暂无 Popup"
                        >
                            当前没有弹窗通知。
                        </n-alert>

                        <div
                            v-for="(item, index) in popupNotificationDrafts"
                            :key="item.localId"
                            class="notification-item-editor"
                        >
                            <div class="notification-item-toolbar">
                                <n-space align="center">
                                    <n-tag type="warning">Popup #{{ index + 1 }}</n-tag>
                                    <n-form-item
                                        label="启用"
                                        label-placement="left"
                                        :show-feedback="false"
                                        class="announcement-enabled-field"
                                    >
                                        <n-switch v-model:value="item.enabled" />
                                    </n-form-item>
                                    <n-form-item
                                        label="仅登录可见"
                                        label-placement="left"
                                        :show-feedback="false"
                                        class="announcement-enabled-field"
                                    >
                                        <n-switch v-model:value="item.loginOnly" />
                                    </n-form-item>
                                </n-space>
                                <n-space>
                                    <n-button
                                        size="small"
                                        :disabled="index === 0"
                                        @click="moveNotification(item.localId, -1)"
                                    >
                                        上移
                                    </n-button>
                                    <n-button
                                        size="small"
                                        :disabled="index === popupNotificationDrafts.length - 1"
                                        @click="moveNotification(item.localId, 1)"
                                    >
                                        下移
                                    </n-button>
                                    <n-button
                                        size="small"
                                        type="error"
                                        secondary
                                        @click="removeNotification(item.localId)"
                                    >
                                        删除
                                    </n-button>
                                </n-space>
                            </div>

                            <n-form-item label="标题" :show-feedback="false">
                                <n-input v-model:value="item.title" />
                            </n-form-item>

                            <HtmlCodeEditor v-model:value="item.content" />

                            <div class="announcement-preview-shell">
                                <div class="muted">Popup 预览</div>
                                <div class="announcement-preview" v-html="item.content"></div>
                            </div>
                        </div>
                    </section>

                    <n-space justify="end">
                        <n-button
                            type="primary"
                            :loading="savingNotifications"
                            @click="handleNotificationsSave"
                        >
                            保存通知配置
                        </n-button>
                    </n-space>
                </n-space>
                <n-alert v-else type="warning" title="缺少 MANAGE_ANNOUNCEMENTS">
                    你没有公告管理权限。
                </n-alert>
            </n-spin>
        </Card>
    </div>
</template>

<style scoped>
.announcement-card {
    margin-bottom: 16px;
}

.muted {
    color: var(--ui-muted-text-color);
}

.announcement-toolbar {
    align-items: flex-start;
}

.announcement-title-field {
    flex: 1;
    margin-bottom: 0;
}

.announcement-enabled-field {
    margin-bottom: 0;
}

.notification-editor-section {
    padding: 14px;
    border: 1px solid var(--ui-border-color);
    border-radius: var(--ui-card-radius);
    background: var(--ui-panel-color);
}

.notification-editor-heading {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 16px;
    margin-bottom: 12px;
}

.notification-editor-heading strong {
    color: var(--ui-card-title-color);
    font-size: 15px;
}

.notification-editor-heading p {
    margin: 4px 0 0;
    font-size: 12px;
}

.notification-item-editor {
    padding: 14px;
    border: 1px solid var(--ui-border-color);
    border-radius: var(--ui-card-radius);
    background: var(--ui-card-color);
}

.notification-item-editor + .notification-item-editor {
    margin-top: 12px;
}

.notification-item-toolbar {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 16px;
    margin-bottom: 12px;
}

.announcement-preview-shell {
    margin-top: 8px;
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.announcement-preview {
    min-height: 120px;
    padding: 16px;
    border-radius: var(--ui-card-radius);
    background: var(--ui-panel-color);
    border: 1px solid var(--ui-border-color);
    color: var(--ui-secondary-text-color);
    line-height: 1.7;
}

.announcement-preview :deep(a) {
    color: var(--ui-link-color);
    text-decoration: none;
    transition: color 0.2s;
}

.announcement-preview :deep(a:hover) {
    color: var(--ui-link-hover-color) !important;
}
</style>
