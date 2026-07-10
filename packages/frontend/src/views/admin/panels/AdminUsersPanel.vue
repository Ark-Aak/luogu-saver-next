<script setup lang="ts">
import { computed, h, onMounted, ref } from 'vue';
import {
    NAlert,
    NAvatar,
    NButton,
    NDataTable,
    NInput,
    NInputNumber,
    NSpin,
    useMessage
} from 'naive-ui';
import type { DataTableColumns } from 'naive-ui';
import Card from '@/components/Card.vue';
import { getAdminUsers, updateAdminUserRole, type AdminUser } from '@/api/admin.ts';
import { currentAuth } from '@/utils/auth.ts';
import { hasPermission, Permission } from '@/utils/permissions.ts';
import { formatDate } from '@/utils/render';

const message = useMessage();

const users = ref<AdminUser[]>([]);
const loading = ref(false);
const searchKeyword = ref('');

const canManageUsers = computed(() =>
    hasPermission(currentAuth.value?.role, Permission.MANAGE_USERS)
);

const filteredUsers = computed(() => {
    const keyword = searchKeyword.value.trim().toLowerCase();
    if (!keyword) return users.value;
    return users.value.filter(
        user =>
            user.name.toLowerCase().includes(keyword) ||
            String(user.luoguUid).includes(keyword) ||
            String(user.id).includes(keyword)
    );
});

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

const columns: DataTableColumns<AdminUser> = [
    { title: 'ID', key: 'id', width: 72 },
    {
        title: '用户',
        key: 'name',
        minWidth: 180,
        render(row) {
            return h('div', { class: 'user-cell' }, [
                h(NAvatar, {
                    size: 'small',
                    round: true,
                    src: row.avatarUrl ?? undefined,
                    fallbackSrc: undefined
                }),
                h('span', row.name)
            ]);
        }
    },
    { title: 'Luogu UID', key: 'luoguUid', width: 110 },
    {
        title: '注册时间',
        key: 'createdAt',
        width: 170,
        render: row => formatDate(row.createdAt)
    },
    {
        title: 'Role',
        key: 'role',
        width: 160,
        render(row) {
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
        width: 100,
        render(row) {
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

onMounted(() => {
    void loadUsers();
});
</script>

<template>
    <Card title="注册用户" class="users-card">
        <n-spin :show="loading">
            <template v-if="canManageUsers">
                <n-input
                    v-model:value="searchKeyword"
                    placeholder="按名称 / Luogu UID / ID 筛选"
                    clearable
                    class="user-search"
                />
                <n-data-table
                    :columns="columns"
                    :data="filteredUsers"
                    :pagination="{ pageSize: 10 }"
                    :row-key="(row: AdminUser) => row.id"
                />
            </template>
            <n-alert v-else type="warning" title="缺少 MANAGE_USERS">
                你没有用户管理权限。
            </n-alert>
        </n-spin>
    </Card>
</template>

<style scoped>
.users-card {
    margin-bottom: 16px;
}

.user-search {
    max-width: 320px;
    margin-bottom: 12px;
}

.users-card :deep(.user-cell) {
    display: flex;
    align-items: center;
    gap: 8px;
}
</style>
