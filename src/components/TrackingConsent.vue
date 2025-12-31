<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { NCard, NSpace, NButton, NText, NIcon } from 'naive-ui';
import { AnalyticsOutline } from '@vicons/ionicons5'; // 需要安装图标库

const show = ref(false);

import { CONSENT_TRACKING_STORAGE_KEY } from "@/utils/constants.ts";

onMounted(() => {
	const consent = localStorage.getItem(CONSENT_TRACKING_STORAGE_KEY);
	if (consent === null) {
		setTimeout(() => {
			show.value = true;
		}, 500);
	}
});

const handleAccept = () => {
	localStorage.setItem(CONSENT_TRACKING_STORAGE_KEY, 'true');
	show.value = false;
};

const handleReject = () => {
	localStorage.setItem(CONSENT_TRACKING_STORAGE_KEY, 'false');
	show.value = false;
};
</script>

<template>
	<Transition name="slide-up">
		<div v-if="show" class="consent-banner">
			<n-card content-style="padding: 16px;" :bordered="false" class="consent-card">
				<div class="content-wrapper">
					
					<div class="text-section">
						<div class="icon-wrapper">
							<n-icon size="24" color="#2080f0">
								<AnalyticsOutline/>
							</n-icon>
						</div>
						<div class="text-content">
							<n-text strong>我们需要您的许可</n-text>
							<n-text depth="3" class="description">
								为了提供更精准的内容推荐，我们希望收集您的设备信息用于数据分析。
								<n-button text type="primary" size="tiny">
									查看隐私政策
								</n-button>
							</n-text>
						</div>
					</div>
					
					<n-space class="action-section">
						<n-button secondary @click="handleReject">
							拒绝
						</n-button>
						<n-button type="primary" @click="handleAccept">
							同意并开启
						</n-button>
					</n-space>
				
				</div>
			</n-card>
		</div>
	</Transition>
</template>

<style scoped>
.consent-banner {
	position: fixed;
	bottom: 24px;
	left: 50%;
	transform: translateX(-50%);
	width: 90%;
	max-width: 800px;
	z-index: 9999;
}

.consent-card {
	box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
	border-radius: 12px;
	background-color: rgba(255, 255, 255, 0.95);
	backdrop-filter: blur(10px);
	border: 1px solid rgba(0, 0, 0, 0.05);
}

.content-wrapper {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 16px;
}

.text-section {
	display: flex;
	align-items: flex-start;
	gap: 12px;
	flex: 1;
}

.description {
	display: block;
	font-size: 13px;
	margin-top: 2px;
	line-height: 1.4;
}

.action-section {
	flex-shrink: 0;
}

@media (max-width: 600px) {
	.consent-banner {
		bottom: 0;
		left: 0;
		width: 100%;
		transform: none;
		border-radius: 12px 12px 0 0;
	}
	
	.consent-card {
		border-radius: 12px 12px 0 0;
	}

	.content-wrapper {
		flex-direction: column;
		align-items: flex-start;
	}

	.action-section {
		width: 100%;
		justify-content: flex-end;
		margin-top: 12px;
	}
}

.slide-up-enter-active,
.slide-up-leave-active {
	transition: all 0.3s cubic-bezier(0.25, 0.8, 0.5, 1);
}

.slide-up-enter-from,
.slide-up-leave-to {
	transform: translate(-50%, 100%);
	opacity: 0;
}

@media (max-width: 600px) {
	.slide-up-enter-from,
	.slide-up-leave-to {
		transform: translateY(100%);
	}
}
</style>