<script setup lang="ts">
import { useRouter } from 'vue-router';
import { NButton, NIcon } from 'naive-ui';
import { HomeOutline } from '@vicons/ionicons5';

const router = useRouter();
const goHome = () => {
	router.replace('/');
};
</script>

<template>
	<div class="not-found">
		<div class="error-container">
			<div class="error-code">404</div>
			<h1 class="error-title">页面未找到</h1>
			<p class="error-description">抱歉，您访问的页面不存在或已被移动。</p>
			<n-button type="primary" size="large" @click="goHome" class="home-button">
				<template #icon>
					<n-icon :component="HomeOutline" />
				</template>
				返回首页
			</n-button>
		</div>
	</div>
</template>

<style scoped>
.not-found {
	min-height: 60vh;
	display: flex;
	justify-content: center;
	align-items: center;
	padding: 40px 24px;
}

.error-container {
	text-align: center;
	max-width: 400px;
}

.error-code {
	font-size: 120px;
	font-weight: 700;
	line-height: 1;
	background: linear-gradient(135deg, #007AFF 0%, #5AC8FA 50%, #AF52DE 100%);
	-webkit-background-clip: text;
	-webkit-text-fill-color: transparent;
	background-clip: text;
	margin-bottom: 16px;
	letter-spacing: -0.05em;
}

.error-title {
	font-size: 28px;
	font-weight: 600;
	color: #1d1d1f;
	margin: 0 0 12px;
	letter-spacing: -0.02em;
}

.error-description {
	font-size: 16px;
	color: #86868b;
	margin: 0 0 32px;
	line-height: 1.5;
}

.home-button {
	background: linear-gradient(180deg, #0A84FF 0%, #007AFF 100%) !important;
	border: none !important;
	box-shadow: 0 2px 8px rgba(0, 122, 255, 0.3) !important;
	height: 44px !important;
	padding: 0 28px !important;
	font-size: 15px !important;
	font-weight: 500 !important;
	border-radius: 12px !important;
}

.home-button:hover {
	box-shadow: 0 4px 16px rgba(0, 122, 255, 0.4) !important;
	transform: translateY(-1px);
}
</style>