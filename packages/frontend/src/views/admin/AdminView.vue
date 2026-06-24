<script setup lang="ts">
import { computed, h, nextTick, onBeforeUnmount, onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';
import {
    NAlert,
    NButton,
    NDataTable,
    NFormItem,
    NInput,
    NInputNumber,
    NSpace,
    NSpin,
    NSwitch,
    NTag,
    useMessage
} from 'naive-ui';
import { ShieldCheckmarkOutline } from '@vicons/ionicons5';
import CardTitle from '@/components/CardTitle.vue';
import Card from '@/components/Card.vue';
import { getCurrentUser } from '@/api/auth.ts';
import {
    getAdminUsers,
    getAdminAnnouncement,
    rebuildArticleEmbeddings,
    reindexSearch,
    startArticlePlazaDiscovery,
    stopDiscoveryRun,
    updateAdminAnnouncement,
    updateAdminUserRole,
    type AdminUser,
    type DiscoveryRun
} from '@/api/admin.ts';
import { currentAuth, isAuthenticated, setCurrentAuth, startCpOAuthLogin } from '@/utils/auth.ts';
import { hasAnyPermission, hasPermission, Permission } from '@/utils/permissions.ts';
import { useContentSaver } from '@/composables/useContentSaver.ts';
import HtmlCodeEditor from '@/components/HtmlCodeEditor.vue';
import websocket, { joinRoom, leaveRoom, refreshSocketAuth } from '@/utils/websocket.ts';

const DISCOVERY_RUNS_ROOM = 'discovery:runs';
const DISCOVERY_RUNS_EVENT = 'discovery:runs:update';
const SOCKET_JOIN_ERROR_EVENT = 'join:error';

const message = useMessage();
const route = useRoute();
const socket = websocket.getInstance();
const announcementSectionRef = ref<InstanceType<typeof Card> | null>(null);
const users = ref<AdminUser[]>([]);
const loading = ref(false);
const reindexing = ref(false);
const rebuildingEmbeddings = ref(false);
const startingDiscovery = ref(false);
const loadingDiscoveryRuns = ref(false);
const loadingAnnouncement = ref(false);
const savingAnnouncement = ref(false);
const batchSize = ref(100);
const embeddingBatchSize = ref(20);
const embeddingConcurrency = ref(5);
const discoveryMaxPages = ref(50);
const discoveryForceUpdate = ref(false);
const discoveryIncludeCategories = ref(true);
const discoveryRuns = ref<DiscoveryRun[]>([]);
const announcementForm = ref({
    title: '公告',
    content: '',
    enabled: true
});
const { setupTaskUpdateListener } = useContentSaver();
let discoverySocketAttached = false;

const canManageUsers = computed(() =>
    hasPermission(currentAuth.value?.role, Permission.MANAGE_USERS)
);
const canManageSearch = computed(() =>
    hasPermission(currentAuth.value?.role, Permission.MANAGE_SEARCH)
);
const canOpenAdmin = computed(() =>
    hasAnyPermission(currentAuth.value?.role, [
        Permission.MANAGE_USERS,
        Permission.MANAGE_SEARCH,
        Permission.MANAGE_ANNOUNCEMENTS,
        Permission.MANAGE_DISCOVERY
    ])
);
const canManageAnnouncements = computed(() =>
    hasPermission(currentAuth.value?.role, Permission.MANAGE_ANNOUNCEMENTS)
);
const canManageDiscovery = computed(() =>
    hasPermission(currentAuth.value?.role, Permission.MANAGE_DISCOVERY)
);

async function loadCurrentAuth() {
    if (!isAuthenticated.value || currentAuth.value) return;
    const response = await getCurrentUser();
    if (response.code === 200) setCurrentAuth(response.data);
}

async function loadUsers() {
    if (!canManageUsers.value) return;
    loading.value = true;
    try {
        const response = await getAdminUsers();
        if (response.code === 200) users.value = response.data;
        else message.error(response.message);
    } finally {
        loading.value = false;
    }
}

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

function handleDiscoveryRunsUpdate(payload: { runs?: DiscoveryRun[] }) {
    if (!Array.isArray(payload.runs)) return;
    discoveryRuns.value = payload.runs;
    loadingDiscoveryRuns.value = false;
}

function handleSocketJoinError(payload: { room?: string; message?: string }) {
    if (payload.room !== DISCOVERY_RUNS_ROOM) return;
    loadingDiscoveryRuns.value = false;
    message.error(payload.message || '发现任务 WebSocket 订阅失败');
}

function attachDiscoverySocket() {
    if (discoverySocketAttached || !canManageDiscovery.value) return;
    refreshSocketAuth();
    loadingDiscoveryRuns.value = true;
    socket.on(DISCOVERY_RUNS_EVENT, handleDiscoveryRunsUpdate);
    socket.on(SOCKET_JOIN_ERROR_EVENT, handleSocketJoinError);
    joinRoom(DISCOVERY_RUNS_ROOM);
    discoverySocketAttached = true;
}

function detachDiscoverySocket() {
    if (!discoverySocketAttached) return;
    socket.off(DISCOVERY_RUNS_EVENT, handleDiscoveryRunsUpdate);
    socket.off(SOCKET_JOIN_ERROR_EVENT, handleSocketJoinError);
    leaveRoom(DISCOVERY_RUNS_ROOM);
    discoverySocketAttached = false;
}

function requestDiscoveryRunsSnapshot() {
    if (!canManageDiscovery.value) return;
    loadingDiscoveryRuns.value = true;
    if (discoverySocketAttached) {
        leaveRoom(DISCOVERY_RUNS_ROOM);
        joinRoom(DISCOVERY_RUNS_ROOM);
        return;
    }
    attachDiscoverySocket();
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

async function saveRole(row: AdminUser) {
    if (row.role === null) return;
    const response = await updateAdminUserRole(row.id, row.role);
    if (response.code === 200) message.success('权限已更新');
    else message.error(response.message);
}

async function handleReindex() {
    reindexing.value = true;
    const response = await reindexSearch(batchSize.value);
    if (response.code !== 200) {
        message.error(response.message);
        reindexing.value = false;
        return;
    }

    const taskId = response.data.reportTaskIds['reindex-search'];
    setupTaskUpdateListener(
        taskId,
        () => {
            reindexing.value = false;
            message.success('搜索索引重建完成');
        },
        error => {
            reindexing.value = false;
            message.error(error || '搜索索引重建失败');
        }
    );
    message.success('搜索索引重建任务已提交');
}

async function handleEmbeddingRebuild() {
    rebuildingEmbeddings.value = true;
    const response = await rebuildArticleEmbeddings(
        embeddingBatchSize.value,
        embeddingConcurrency.value
    );
    if (response.code !== 200) {
        message.error(response.message);
        rebuildingEmbeddings.value = false;
        return;
    }

    const taskId = response.data.reportTaskIds['rebuild-embedding'];
    setupTaskUpdateListener(
        taskId,
        data => {
            rebuildingEmbeddings.value = false;
            const result = data?.result?.data;
            if (result) {
                message.success(
                    `Embedding 重建完成：更新 ${result.updated} 篇，失败 ${result.failed} 篇`
                );
                return;
            }
            message.success('Embedding 重建完成');
        },
        error => {
            rebuildingEmbeddings.value = false;
            message.error(error || 'Embedding 重建失败');
        }
    );
    message.success('Embedding 重建任务已提交');
}

async function handleStartDiscovery() {
    if (!canManageDiscovery.value || startingDiscovery.value) return;
    startingDiscovery.value = true;
    try {
        const response = await startArticlePlazaDiscovery({
            maxPages: discoveryMaxPages.value,
            forceUpdate: discoveryForceUpdate.value,
            includeCategories: discoveryIncludeCategories.value
        });
        if (response.code === 200) {
            message.success(`文章发现已启动：${response.data.runId}`);
            loadingDiscoveryRuns.value = true;
        } else {
            message.error(response.message);
        }
    } finally {
        startingDiscovery.value = false;
    }
}

async function handleStopDiscovery(row: DiscoveryRun) {
    const response = await stopDiscoveryRun(row.id);
    if (response.code === 200) {
        message.success('发现任务已停止');
        loadingDiscoveryRuns.value = true;
    } else {
        message.error(response.message);
    }
}

const columns = [
    { title: 'ID', key: 'id', width: 80 },
    { title: '名称', key: 'name' },
    { title: 'Luogu UID', key: 'luoguUid' },
    {
        title: 'Role',
        key: 'role',
        render(row: AdminUser) {
            return h(NInputNumber, {
                value: row.role ?? 0,
                min: -1,
                style: 'width: 140px',
                onUpdateValue(value: number | null) {
                    row.role = value ?? 0;
                }
            });
        }
    },
    {
        title: '操作',
        key: 'actions',
        render(row: AdminUser) {
            return h(
                NButton,
                {
                    size: 'small',
                    type: 'primary',
                    secondary: true,
                    onClick: () => saveRole(row)
                },
                { default: () => '保存' }
            );
        }
    }
];

const discoveryColumns = [
    { title: 'Run ID', key: 'id', width: 260 },
    { title: '状态', key: 'status', width: 100 },
    { title: '页面', key: 'visitedPages', width: 80 },
    { title: '待扫页', key: 'pendingPages', width: 90 },
    { title: '文章', key: 'discoveredArticles', width: 80 },
    { title: 'Workflow', key: 'createdWorkflows', width: 100 },
    { title: '失败页', key: 'failedPages', width: 80 },
    {
        title: '操作',
        key: 'actions',
        width: 100,
        render(row: DiscoveryRun) {
            return h(
                NButton,
                {
                    size: 'small',
                    type: 'warning',
                    secondary: true,
                    disabled: row.status !== 'active',
                    onClick: () => handleStopDiscovery(row)
                },
                { default: () => '停止' }
            );
        }
    }
];

onMounted(async () => {
    await loadCurrentAuth();
    attachDiscoverySocket();
    await Promise.all([loadUsers(), loadAnnouncement()]);
    if (route.query.section === 'announcement') {
        await nextTick();
        announcementSectionRef.value?.$el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
});

onBeforeUnmount(() => {
    detachDiscoverySocket();
});
</script>

<template>
    <div class="admin-page">
        <CardTitle title="后台" :icon="ShieldCheckmarkOutline" class="admin-header" chip="ADMIN">
            MANAGEMENT
        </CardTitle>

        <n-alert v-if="!isAuthenticated" type="warning" title="需要登录" class="state-alert">
            请先登录后访问后台。
            <template #action>
                <n-button size="small" @click="startCpOAuthLogin('/admin')">登录</n-button>
            </template>
        </n-alert>

        <n-alert v-else-if="!canOpenAdmin" type="error" title="无权限" class="state-alert">
            当前账号没有后台管理权限。
        </n-alert>

        <template v-else>
            <div class="admin-grid">
                <Card title="搜索索引">
                    <n-space vertical>
                        <div class="muted">通过 workflow 重建 Meilisearch 文章索引。</div>
                        <n-space align="center">
                            <n-form-item
                                label="每批文章数"
                                label-placement="left"
                                :show-feedback="false"
                                class="batch-size-field"
                            >
                                <n-input-number
                                    v-model:value="batchSize"
                                    :min="1"
                                    :max="500"
                                    placeholder="默认 100，范围 1-500"
                                />
                            </n-form-item>
                            <n-button
                                type="primary"
                                :disabled="!canManageSearch"
                                :loading="reindexing"
                                @click="handleReindex"
                            >
                                重建索引
                            </n-button>
                        </n-space>
                        <n-tag v-if="!canManageSearch" type="warning">缺少 MANAGE_SEARCH</n-tag>
                    </n-space>
                </Card>

                <Card title="文章 Embedding">
                    <n-space vertical>
                        <div class="muted">
                            通过 workflow 为所有未删除文章重新生成 Chroma 向量。
                        </div>
                        <n-space align="center">
                            <n-form-item
                                label="每批文章数"
                                label-placement="left"
                                :show-feedback="false"
                                class="batch-size-field"
                            >
                                <n-input-number
                                    v-model:value="embeddingBatchSize"
                                    :min="1"
                                    :max="100"
                                    placeholder="默认 20，范围 1-100"
                                />
                            </n-form-item>
                            <n-form-item
                                label="并发数"
                                label-placement="left"
                                :show-feedback="false"
                                class="batch-size-field"
                            >
                                <n-input-number
                                    v-model:value="embeddingConcurrency"
                                    :min="1"
                                    :max="50"
                                    placeholder="默认 5，范围 1-50"
                                />
                            </n-form-item>
                            <n-button
                                type="primary"
                                :disabled="!canManageSearch"
                                :loading="rebuildingEmbeddings"
                                @click="handleEmbeddingRebuild"
                            >
                                重建 Embedding
                            </n-button>
                        </n-space>
                        <n-tag v-if="!canManageSearch" type="warning">缺少 MANAGE_SEARCH</n-tag>
                    </n-space>
                </Card>

                <Card title="当前权限">
                    <n-space>
                        <n-tag :type="canManageUsers ? 'success' : 'default'">MANAGE_USERS</n-tag>
                        <n-tag :type="canManageSearch ? 'success' : 'default'">MANAGE_SEARCH</n-tag>
                        <n-tag :type="canManageAnnouncements ? 'success' : 'default'">
                            MANAGE_ANNOUNCEMENTS
                        </n-tag>
                        <n-tag :type="canManageDiscovery ? 'success' : 'default'">
                            MANAGE_DISCOVERY
                        </n-tag>
                    </n-space>
                </Card>

                <Card title="文章发现">
                    <n-space vertical>
                        <div class="muted">
                            扫描洛谷文章广场并为发现的文章创建保存
                            workflow；服务端每小时会自动扫描一次。
                        </div>
                        <n-space align="center">
                            <n-form-item
                                label="最大页面"
                                label-placement="left"
                                :show-feedback="false"
                                class="batch-size-field"
                            >
                                <n-input-number
                                    v-model:value="discoveryMaxPages"
                                    :min="1"
                                    :max="1000"
                                />
                            </n-form-item>
                        </n-space>
                        <n-space align="center">
                            <n-form-item
                                label="分类页"
                                label-placement="left"
                                :show-feedback="false"
                                class="batch-size-field"
                            >
                                <n-switch v-model:value="discoveryIncludeCategories" />
                            </n-form-item>
                            <n-form-item
                                label="强制更新"
                                label-placement="left"
                                :show-feedback="false"
                                class="batch-size-field"
                            >
                                <n-switch v-model:value="discoveryForceUpdate" />
                            </n-form-item>
                            <n-button
                                type="primary"
                                :disabled="!canManageDiscovery"
                                :loading="startingDiscovery"
                                @click="handleStartDiscovery"
                            >
                                启动扫描
                            </n-button>
                            <n-button
                                secondary
                                :disabled="!canManageDiscovery"
                                :loading="loadingDiscoveryRuns"
                                @click="requestDiscoveryRunsSnapshot"
                            >
                                刷新
                            </n-button>
                        </n-space>
                        <n-tag v-if="!canManageDiscovery" type="warning">
                            缺少 MANAGE_DISCOVERY
                        </n-tag>
                    </n-space>
                </Card>
            </div>

            <Card title="发现任务" class="discovery-card">
                <n-spin :show="loadingDiscoveryRuns">
                    <n-data-table
                        v-if="canManageDiscovery"
                        :columns="discoveryColumns"
                        :data="discoveryRuns"
                        :pagination="{ pageSize: 5 }"
                    />
                    <n-alert v-else type="warning" title="缺少 MANAGE_DISCOVERY">
                        你没有文章发现管理权限。
                    </n-alert>
                </n-spin>
            </Card>

            <Card ref="announcementSectionRef" title="公告管理" class="announcement-card">
                <n-spin :show="loadingAnnouncement">
                    <n-space v-if="canManageAnnouncements" vertical size="large">
                        <n-space
                            align="center"
                            justify="space-between"
                            class="announcement-toolbar"
                        >
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
                            <div
                                class="announcement-preview"
                                v-html="announcementForm.content"
                            ></div>
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

            <Card title="注册用户" class="users-card">
                <n-spin :show="loading">
                    <n-data-table
                        v-if="canManageUsers"
                        :columns="columns"
                        :data="users"
                        :pagination="{ pageSize: 10 }"
                    />
                    <n-alert v-else type="warning" title="缺少 MANAGE_USERS">
                        你没有用户管理权限。
                    </n-alert>
                </n-spin>
            </Card>
        </template>
    </div>
</template>

<style scoped>
.admin-page {
    max-width: 1220px;
    margin: 0 auto;
}

.admin-header,
.state-alert,
.discovery-card,
.announcement-card,
.users-card {
    margin-bottom: 16px;
}

.admin-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 16px;
    margin-bottom: 16px;
}

.muted {
    color: var(--ui-muted-text-color);
}

.batch-size-field {
    margin-bottom: 0;
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

.announcement-preview-shell {
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

@media (max-width: 900px) {
    .admin-grid {
        grid-template-columns: 1fr;
    }
}
</style>
