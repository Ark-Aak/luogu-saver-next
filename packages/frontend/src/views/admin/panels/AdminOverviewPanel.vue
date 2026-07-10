<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { NBadge, NIcon, NSpace, NTag } from 'naive-ui';
import {
    CheckmarkCircleOutline,
    ConstructOutline,
    MegaphoneOutline,
    PeopleOutline
} from '@vicons/ionicons5';
import Card from '@/components/Card.vue';
import { getAdminDeletionRequests } from '@/api/deletion-request.ts';
import { currentAuth } from '@/utils/auth.ts';
import { hasPermission, Permission } from '@/utils/permissions.ts';

const router = useRouter();

const pendingReviewCount = ref<number | null>(null);

const canManageContent = computed(() =>
    hasPermission(currentAuth.value?.role, Permission.MANAGE_CONTENT)
);

const permissionChips = computed(() => [
    {
        label: 'MANAGE_USERS',
        granted: hasPermission(currentAuth.value?.role, Permission.MANAGE_USERS)
    },
    {
        label: 'MANAGE_SEARCH',
        granted: hasPermission(currentAuth.value?.role, Permission.MANAGE_SEARCH)
    },
    {
        label: 'MANAGE_ANNOUNCEMENTS',
        granted: hasPermission(currentAuth.value?.role, Permission.MANAGE_ANNOUNCEMENTS)
    },
    {
        label: 'MANAGE_DISCOVERY',
        granted: hasPermission(currentAuth.value?.role, Permission.MANAGE_DISCOVERY)
    },
    { label: 'MANAGE_CONTENT', granted: canManageContent.value }
]);

const entries = computed(() => [
    {
        name: 'admin-review',
        title: '内容审核',
        description: '审核用户提交的文章/剪贴板删除申请。',
        icon: CheckmarkCircleOutline,
        badge: pendingReviewCount.value ?? 0
    },
    {
        name: 'admin-site',
        title: '公告与通知',
        description: '管理站点公告以及 Banner / Popup 通知。',
        icon: MegaphoneOutline,
        badge: 0
    },
    {
        name: 'admin-users',
        title: '用户管理',
        description: '查看注册用户并调整权限位。',
        icon: PeopleOutline,
        badge: 0
    },
    {
        name: 'admin-ops',
        title: '系统运维',
        description: '搜索索引、Embedding 重建与文章发现。',
        icon: ConstructOutline,
        badge: 0
    }
]);

async function loadPendingReviewCount() {
    if (!canManageContent.value) return;
    const response = await getAdminDeletionRequests('pending', 1, 1);
    if (response.code === 200) pendingReviewCount.value = response.data.total;
}

onMounted(() => {
    void loadPendingReviewCount();
});
</script>

<template>
    <div class="overview-panel">
        <Card title="当前权限" class="panel-card">
            <n-space>
                <n-tag
                    v-for="chip in permissionChips"
                    :key="chip.label"
                    :type="chip.granted ? 'success' : 'default'"
                >
                    {{ chip.label }}
                </n-tag>
            </n-space>
        </Card>

        <div class="entry-grid">
            <Card
                v-for="entry in entries"
                :key="entry.name"
                class="entry-card"
                @click="router.push({ name: entry.name })"
            >
                <div class="entry-body">
                    <n-badge :value="entry.badge" :max="99" :show="entry.badge > 0">
                        <div class="entry-icon">
                            <n-icon :component="entry.icon" size="26" />
                        </div>
                    </n-badge>
                    <div class="entry-text">
                        <strong>{{ entry.title }}</strong>
                        <p class="muted">{{ entry.description }}</p>
                    </div>
                </div>
            </Card>
        </div>
    </div>
</template>

<style scoped>
.panel-card {
    margin-bottom: 16px;
}

.entry-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 16px;
}

.entry-card {
    cursor: pointer;
}

.entry-body {
    display: flex;
    align-items: center;
    gap: 16px;
}

.entry-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 48px;
    height: 48px;
    border-radius: var(--ui-card-radius);
    background: var(--ui-panel-color);
    border: 1px solid var(--ui-border-color);
    color: var(--ui-primary-color);
}

.entry-text strong {
    color: var(--ui-card-title-color);
    font-size: 15px;
}

.entry-text p {
    margin: 4px 0 0;
    font-size: 12px;
}

.muted {
    color: var(--ui-muted-text-color);
}

@media (max-width: 900px) {
    .entry-grid {
        grid-template-columns: 1fr;
    }
}
</style>
