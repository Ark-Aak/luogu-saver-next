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
		<div v-if="showAvatar" class="avatar-wrapper">
			<n-avatar
				round
				:size="28"
				:src="`https://cdn.luogu.com.cn/upload/usericon/${user?.id || 3}.png`"
			/>
		</div>
		<a
	 	 :href="`/user/${user?.id}`"
			class="user-name"
			:class="`user-${user?.color || 'Gray'}`"
			target="_blank"
		>
			{{ user?.name || '未知用户' }}
		</a>
	</div>
</template>

<style scoped>
.user-link-container {
	display: inline-flex;
	align-items: center;
	gap: 10px;
}

.avatar-wrapper {
	position: relative;
}

.avatar-wrapper::after {
	content: '';
	position: absolute;
	inset: -2px;
	border-radius: 50%;
	border: 2px solid rgba(0, 0, 0, 0.06);
	pointer-events: none;
}

.avatar-wrapper :deep(.n-avatar) {
	box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.user-name {
	text-decoration: none;
	font-weight: 600;
	font-size: 14px;
	transition: all 0.2s cubic-bezier(0.25, 0.1, 0.25, 1);
}

.user-name:hover {
	opacity: 0.75;
}
</style>