<script setup lang="ts">
import { computed, h, onMounted, ref } from 'vue';
import {
    NAlert,
    NButton,
    NDataTable,
    NFormItem,
    NInputNumber,
    NSpace,
    NSpin,
    NTag,
    useMessage
} from 'naive-ui';
import { ShieldCheckmarkOutline } from '@vicons/ionicons5';
import CardTitle from '@/components/CardTitle.vue';
import Card from '@/components/Card.vue';
import { getCurrentUser } from '@/api/auth.ts';
import {
    getAdminUsers,
    rebuildArticleSummaries,
    reindexSearch,
    updateAdminUserRole,
    type AdminUser
} from '@/api/admin.ts';
import { currentAuth, isAuthenticated, setCurrentAuth, startCpOAuthLogin } from '@/utils/auth.ts';
import { hasAnyPermission, hasPermission, Permission } from '@/utils/permissions.ts';
import { useContentSaver } from '@/composables/useContentSaver.ts';

const message = useMessage();
const users = ref<AdminUser[]>([]);
const loading = ref(false);
const reindexing = ref(false);
const rebuildingSummaries = ref(false);
const batchSize = ref(100);
const summaryBatchSize = ref(20);
const { setupTaskUpdateListener } = useContentSaver();

const canManageUsers = computed(() =>
    hasPermission(currentAuth.value?.role, Permission.MANAGE_USERS)
);
const canManageSearch = computed(() =>
    hasPermission(currentAuth.value?.role, Permission.MANAGE_SEARCH)
);
const canOpenAdmin = computed(() =>
    hasAnyPermission(currentAuth.value?.role, [Permission.MANAGE_USERS, Permission.MANAGE_SEARCH])
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

async function handleSummaryRebuild() {
    rebuildingSummaries.value = true;
    const response = await rebuildArticleSummaries(summaryBatchSize.value);
    if (response.code !== 200) {
        message.error(response.message);
        rebuildingSummaries.value = false;
        return;
    }

    const taskId = response.data.reportTaskIds['rebuild-summary'];
    setupTaskUpdateListener(
        taskId,
        data => {
            rebuildingSummaries.value = false;
            const result = data?.result?.data;
            if (result) {
                message.success(
                    `摘要重建完成：更新 ${result.updated} 篇，失败 ${result.failed} 篇`
                );
                return;
            }
            message.success('摘要重建完成');
        },
        error => {
            rebuildingSummaries.value = false;
            message.error(error || '摘要重建失败');
        }
    );
    message.success('摘要重建任务已提交');
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

onMounted(async () => {
    await loadCurrentAuth();
    await loadUsers();
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

                <Card title="文章摘要">
                    <n-space vertical>
                        <div class="muted">通过 workflow 为所有未删除文章重新生成 summary。</div>
                        <n-space align="center">
                            <n-form-item
                                label="每批文章数"
                                label-placement="left"
                                :show-feedback="false"
                                class="batch-size-field"
                            >
                                <n-input-number
                                    v-model:value="summaryBatchSize"
                                    :min="1"
                                    :max="100"
                                    placeholder="默认 20，范围 1-100"
                                />
                            </n-form-item>
                            <n-button
                                type="primary"
                                :disabled="!canManageSearch"
                                :loading="rebuildingSummaries"
                                @click="handleSummaryRebuild"
                            >
                                重建摘要
                            </n-button>
                        </n-space>
                        <n-tag v-if="!canManageSearch" type="warning">缺少 MANAGE_SEARCH</n-tag>
                    </n-space>
                </Card>

                <Card title="当前权限">
                    <n-space>
                        <n-tag :type="canManageUsers ? 'success' : 'default'">MANAGE_USERS</n-tag>
                        <n-tag :type="canManageSearch ? 'success' : 'default'">MANAGE_SEARCH</n-tag>
                    </n-space>
                </Card>
            </div>

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
    color: #64748b;
}

.batch-size-field {
    margin-bottom: 0;
}

@media (max-width: 900px) {
    .admin-grid {
        grid-template-columns: 1fr;
    }
}
</style>
