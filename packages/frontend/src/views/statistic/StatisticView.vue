<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { NButton, NIcon, NSpin, NTag, useMessage } from 'naive-ui';
import {
    CheckmarkCircleOutline,
    PulseOutline,
    RefreshOutline,
    ServerOutline,
    TimeOutline,
    WarningOutline
} from '@vicons/ionicons5';
import Card from '@/components/Card.vue';
import CardTitle from '@/components/CardTitle.vue';
import { getQueueStats, type QueueStatsItem, type QueueStatsResponse } from '@/api/statistic.ts';
import websocket, {
    joinRoom,
    leaveRoom,
    socketConnected,
    socketLastError,
    socketReconnectAttempt,
    socketReconnecting
} from '@/utils/websocket.ts';
import { formatDate } from '@/utils/render.ts';

const QUEUE_STATS_ROOM = 'stats:queues';
const QUEUE_STATS_EVENT = 'stats:queues:update';

const message = useMessage();
const loading = ref(false);
const stats = ref<QueueStatsResponse | null>(null);
const socket = websocket.getInstance();

function pendingCount(queue: QueueStatsItem) {
    return (
        queue.counts.waiting +
        queue.counts.paused +
        queue.counts.prioritized +
        queue.counts.waitingChildren
    );
}

const totals = computed(() => {
    const initial = { waiting: 0, active: 0, delayed: 0, failed: 0, completed: 0 };
    return (stats.value?.queues || []).reduce((acc, queue) => {
        acc.waiting += pendingCount(queue);
        acc.active += queue.counts.active;
        acc.delayed += queue.counts.delayed;
        acc.failed += queue.counts.failed;
        acc.completed += queue.counts.completed;
        return acc;
    }, initial);
});

const lastUpdated = computed(() => {
    if (!stats.value?.generatedAt) return '-';
    return formatDate(stats.value.generatedAt);
});

function queueStatus(queue: QueueStatsItem) {
    if (queue.isPaused || queue.counts.paused > 0)
        return { label: '暂停', type: 'warning' as const };
    if (pendingCount(queue) > 0 || queue.counts.delayed > 0) {
        return { label: '有堆积', type: 'warning' as const };
    }
    if (queue.counts.active > 0) return { label: '运行中', type: 'info' as const };
    return { label: '正常', type: 'success' as const };
}

async function refreshQueueStats() {
    loading.value = true;
    const response = await getQueueStats();
    loading.value = false;
    if (response.code !== 200) {
        message.error(response.message);
        return;
    }
    stats.value = response.data;
}

function handleQueueStatsUpdate(payload: QueueStatsResponse) {
    stats.value = payload;
}

onMounted(async () => {
    socket.on(QUEUE_STATS_EVENT, handleQueueStatsUpdate);
    joinRoom(QUEUE_STATS_ROOM);
    await refreshQueueStats();
});

onUnmounted(() => {
    socket.off(QUEUE_STATS_EVENT, handleQueueStatsUpdate);
    leaveRoom(QUEUE_STATS_ROOM);
});
</script>

<template>
    <div class="statistic-page">
        <CardTitle title="统计数据" :icon="PulseOutline" chip="QUEUE STATS">
            REAL-TIME WORKER QUEUES
        </CardTitle>

        <div class="summary-grid">
            <Card title="WebSocket" :icon="ServerOutline">
                <div class="summary-card-body">
                    <n-tag
                        :type="
                            socketConnected ? 'success' : socketReconnecting ? 'warning' : 'error'
                        "
                    >
                        {{ socketConnected ? '已连接' : socketReconnecting ? '重连中' : '已断开' }}
                    </n-tag>
                    <div class="summary-value">
                        {{
                            socketReconnectAttempt
                                ? `第 ${socketReconnectAttempt} 次重连`
                                : '实时通道'
                        }}
                    </div>
                    <div class="summary-hint">
                        {{ socketLastError || '断线后会自动重新订阅队列状态' }}
                    </div>
                </div>
            </Card>
            <Card title="等待任务" :icon="TimeOutline">
                <div class="summary-card-body">
                    <div class="summary-number">{{ totals.waiting }}</div>
                    <div class="summary-hint">等待 worker 处理的任务数</div>
                </div>
            </Card>
            <Card title="运行任务" :icon="CheckmarkCircleOutline">
                <div class="summary-card-body">
                    <div class="summary-number">{{ totals.active }}</div>
                    <div class="summary-hint">当前正在执行的任务数</div>
                </div>
            </Card>
            <Card title="失败任务" :icon="WarningOutline">
                <div class="summary-card-body">
                    <div class="summary-number danger">{{ totals.failed }}</div>
                    <div class="summary-hint">BullMQ 保留的失败任务数</div>
                </div>
            </Card>
        </div>

        <div class="toolbar">
            <div class="toolbar-text">
                最后更新：{{ lastUpdated }}；队列池：{{ stats?.queuePoolSize ?? '-' }} 个连接
            </div>
            <n-button secondary :loading="loading" @click="refreshQueueStats">
                <template #icon>
                    <n-icon :component="RefreshOutline" />
                </template>
                手动刷新
            </n-button>
        </div>

        <div v-if="loading && !stats" class="loading-block">
            <n-spin size="small" />
            <span>正在加载队列状态...</span>
        </div>

        <div v-else class="queue-grid">
            <Card v-for="queue in stats?.queues || []" :key="queue.name" :title="queue.label">
                <div class="queue-card-body">
                    <div class="queue-head">
                        <span class="queue-name">{{ queue.name }}</span>
                        <n-tag :type="queueStatus(queue).type" size="small">
                            {{ queueStatus(queue).label }}
                        </n-tag>
                    </div>
                    <div class="queue-metrics">
                        <div class="metric">
                            <span>并发</span>
                            <strong>{{ queue.concurrency }}</strong>
                        </div>
                        <div class="metric">
                            <span>等待</span>
                            <strong>{{ pendingCount(queue) }}</strong>
                        </div>
                        <div class="metric">
                            <span>运行</span>
                            <strong>{{ queue.counts.active }}</strong>
                        </div>
                        <div class="metric">
                            <span>延迟</span>
                            <strong>{{ queue.counts.delayed }}</strong>
                        </div>
                        <div class="metric">
                            <span>依赖等待</span>
                            <strong>{{ queue.counts.waitingChildren }}</strong>
                        </div>
                        <div class="metric">
                            <span>优先等待</span>
                            <strong>{{ queue.counts.prioritized }}</strong>
                        </div>
                        <div class="metric">
                            <span>暂停等待</span>
                            <strong>{{ queue.counts.paused }}</strong>
                        </div>
                        <div class="metric">
                            <span>失败</span>
                            <strong>{{ queue.counts.failed }}</strong>
                        </div>
                        <div class="metric">
                            <span>完成</span>
                            <strong>{{ queue.counts.completed }}</strong>
                        </div>
                    </div>
                </div>
            </Card>
        </div>
    </div>
</template>

<style scoped>
.statistic-page {
    max-width: 1220px;
    margin: 0 auto;
}

.summary-grid,
.queue-grid {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 16px;
    margin-top: 16px;
}

.queue-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
}

.summary-card-body,
.queue-card-body {
    display: flex;
    flex-direction: column;
    gap: 10px;
}

.summary-number {
    color: var(--ui-card-title-color);
    font-size: 32px;
    font-weight: 700;
}

.summary-value,
.queue-name {
    color: var(--ui-secondary-text-color);
    font-weight: 600;
}

.summary-number.danger {
    color: var(--ui-error-color);
}

.summary-hint,
.toolbar-text {
    color: var(--ui-muted-text-color);
    line-height: 1.6;
}

.toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    margin: 16px 0;
}

.loading-block {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    min-height: 160px;
    color: var(--ui-muted-text-color);
}

.queue-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
}

.queue-metrics {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 8px;
}

.metric {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    padding: 8px 10px;
    border: 1px solid var(--ui-border-color);
    border-radius: var(--ui-card-radius);
    background: var(--ui-panel-color);
    color: var(--ui-muted-text-color);
}

.metric strong {
    color: var(--ui-card-title-color);
}

.detail-card,
.tips-card {
    margin-top: 16px;
}

@media (max-width: 1100px) {
    .summary-grid,
    .queue-grid {
        grid-template-columns: repeat(2, minmax(0, 1fr));
    }
}

@media (max-width: 680px) {
    .summary-grid,
    .queue-grid,
    .queue-metrics {
        grid-template-columns: minmax(0, 1fr);
    }

    .toolbar,
    .queue-head {
        align-items: flex-start;
        flex-direction: column;
    }
}
</style>
