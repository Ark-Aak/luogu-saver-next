<script setup lang="ts">
import { useRouter } from 'vue-router';
import { NResult, NButton } from 'naive-ui';

const router = useRouter();
const goHome = () => {
	router.replace('/');
};
</script>

<template>
	<div class="not-found">
		<n-result
			status="404"
			title="404 Not Found"
			description="抱歉，您访问的页面不存在。"
		>
			<template #footer>
		 	 <n-button type="primary" ghost @click="goHome">
		 		 返回首页
		 	 </n-button>
			</template>
		</n-result>
	</div>
</template>

<style scoped>
.not-found {
	height: 60vh;
	display: flex;
	justify-content: center;
	align-items: center;
	padding: 24px;
}
</style>