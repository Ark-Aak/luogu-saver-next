<script setup lang="ts">
import { ref } from 'vue';
import { NAlert, NButton, NInputNumber, NSpace, NSwitch, useMessage } from 'naive-ui';
import { CloudDownloadOutline } from '@vicons/ionicons5';
import Card from '@/components/Card.vue';
import CardTitle from '@/components/CardTitle.vue';
import { startUserArticleDiscovery } from '@/api/discovery.ts';

const message = useMessage();
const uid = ref<number | null>(null);
const maxPages = ref(500);
const forceUpdate = ref(false);
const starting = ref(false);

async function handleStart() {
    if (!uid.value || uid.value <= 0 || starting.value) return;
    starting.value = true;
    try {
        const response = await startUserArticleDiscovery({
            uid: uid.value,
            maxPages: maxPages.value,
            forceUpdate: forceUpdate.value
        });
        if (response.code === 200) {
            message.success(`用户文章爬取已启动：${response.data.runId}`);
        } else {
            message.error(response.message || '启动失败');
        }
    } catch (error: any) {
        message.error(error?.message || '启动失败');
    } finally {
        starting.value = false;
    }
}
</script>

<template>
    <div class="user-article-discovery-page">
        <CardTitle title="用户文章爬取" :icon="CloudDownloadOutline" chip="DISCOVERY">
            输入洛谷 UID，批量发现并保存该用户公开文章。
        </CardTitle>

        <Card title="启动爬取" :icon="CloudDownloadOutline" class="discovery-card">
            <n-space vertical size="large">
                <n-alert type="warning" title="抓取说明">
                    启动该任务会爬取指定用户的所有文章进行保存。<br />
                    请不要滥用此功能！
                </n-alert>

                <n-space align="center" class="form-row">
                    <n-input-number
                        v-model:value="uid"
                        :min="1"
                        :show-button="false"
                        placeholder="洛谷 UID，例如 381949"
                        class="uid-input"
                    />
                    <n-input-number
                        v-model:value="maxPages"
                        :min="1"
                        :max="500"
                        placeholder="最大页数"
                        class="page-input"
                    />
                    <span class="muted">强制更新</span>
                    <n-switch v-model:value="forceUpdate" />
                    <n-button
                        type="primary"
                        :loading="starting"
                        :disabled="!uid"
                        @click="handleStart"
                    >
                        开始爬取
                    </n-button>
                </n-space>
            </n-space>
        </Card>
    </div>
</template>

<style scoped>
.user-article-discovery-page {
    max-width: 1220px;
    margin: 0 auto;
}

.discovery-card {
    margin-top: 16px;
}

.form-row {
    flex-wrap: wrap;
}

.uid-input {
    width: 260px;
}

.page-input {
    width: 160px;
}

.muted {
    color: var(--ui-muted-text-color);
}
</style>
