<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { NAlert, NButton, NTabPane, NTabs } from 'naive-ui';
import { ShieldCheckmarkOutline } from '@vicons/ionicons5';
import CardTitle from '@/components/CardTitle.vue';
import { getCurrentUser } from '@/api/auth.ts';
import { currentAuth, isAuthenticated, setCurrentAuth, startCpOAuthLogin } from '@/utils/auth.ts';
import { hasAnyPermission, Permission } from '@/utils/permissions.ts';

const route = useRoute();
const router = useRouter();

const TABS = [
    { name: 'admin', label: '概览' },
    { name: 'admin-review', label: '内容审核' },
    { name: 'admin-site', label: '公告与通知' },
    { name: 'admin-users', label: '用户管理' },
    { name: 'admin-ops', label: '系统运维' }
];

const activeTab = computed(() => (route.name as string) ?? 'admin');

const canOpenAdmin = computed(() =>
    hasAnyPermission(currentAuth.value?.role, [
        Permission.MANAGE_USERS,
        Permission.MANAGE_SEARCH,
        Permission.MANAGE_ANNOUNCEMENTS,
        Permission.MANAGE_DISCOVERY,
        Permission.MANAGE_CONTENT
    ])
);

function handleTabChange(name: string) {
    router.push({ name });
}

onMounted(async () => {
    if (isAuthenticated.value && !currentAuth.value) {
        const response = await getCurrentUser();
        if (response.code === 200) setCurrentAuth(response.data);
    }

    // Legacy deep link: /admin?section=announcement used to scroll to the
    // announcement card before the console was split into sub-pages.
    if (route.query.section === 'announcement' && route.name === 'admin') {
        await router.replace({ name: 'admin-site' });
    }
});
</script>

<template>
    <div class="admin-page">
        <CardTitle title="后台" :icon="ShieldCheckmarkOutline" class="admin-header" chip="ADMIN">
            MANAGEMENT
        </CardTitle>

        <n-alert v-if="!isAuthenticated" type="warning" title="需要登录" class="state-alert">
            <div class="state-alert-content">
                <span>请先登录后访问后台。</span>
                <n-button size="small" @click="startCpOAuthLogin('/admin')">登录</n-button>
            </div>
        </n-alert>

        <n-alert v-else-if="!canOpenAdmin" type="error" title="无权限" class="state-alert">
            当前账号没有后台管理权限。
        </n-alert>

        <template v-else>
            <n-tabs
                type="line"
                :value="activeTab"
                class="admin-tabs"
                @update:value="handleTabChange"
            >
                <n-tab-pane
                    v-for="tab in TABS"
                    :key="tab.name"
                    :name="tab.name"
                    :tab="tab.label"
                    display-directive="if"
                />
            </n-tabs>

            <router-view />
        </template>
    </div>
</template>

<style scoped>
.admin-page {
    max-width: 1220px;
    margin: 0 auto;
}

.admin-header,
.state-alert {
    margin-bottom: 16px;
}

.admin-tabs {
    margin-bottom: 16px;
}
</style>
