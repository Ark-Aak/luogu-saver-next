<script setup lang="ts">
import { NAvatar } from 'naive-ui';
import type { User } from '@/types/user';

defineProps<{
    user?: User;
    showAvatar?: boolean;
}>();
</script>

<template>
    <div class="user-link-container">
        <n-avatar
            v-if="showAvatar"
            round
            size="small"
            :src="`https://cdn.luogu.com.cn/upload/usericon/${user?.id || 3}.png`"
            style="margin-right: 8px"
        />
        <a :href="`/user/${user?.id}`" class="user-name" :class="`user-${user?.color || 'Gray'}`" target="_blank">
            {{ user?.name || '未知用户' }}
        </a>
    </div>
</template>

<style scoped>
.user-link-container {
    display: inline-flex;
    align-items: center;
}
.user-name {
    text-decoration: none;
    font-weight: 600;
    transition: opacity 0.2s;
}
.user-name:hover {
    opacity: 0.8;
}
</style>
