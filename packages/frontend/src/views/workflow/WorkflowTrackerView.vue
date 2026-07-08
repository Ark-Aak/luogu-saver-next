<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { useRoute } from 'vue-router';
import {
    NButton,
    NEmpty,
    NIcon,
    NProgress,
    NSpace,
    NSpin,
    NTag,
    NTooltip,
    useMessage
} from 'naive-ui';
import {
    CheckmarkCircleOutline,
    CloseCircleOutline,
    CopyOutline,
    GitNetworkOutline,
    PlayCircleOutline,
    SyncOutline,
    TimeOutline
} from '@vicons/ionicons5';
import Card from '@/components/Card.vue';
import CardTitle from '@/components/CardTitle.vue';
import {
    getWorkflowById,
    type WorkflowDetailResponse,
    type WorkflowTaskNode
} from '@/api/workflow';
import { formatDate } from '@/utils/render';

type TaskLayer = {
    index: number;
    tasks: WorkflowTaskNode[];
};

const route = useRoute();
const message = useMessage();
const workflowId = computed(() => String(route.params.id || ''));
const workflow = ref<WorkflowDetailResponse | null>(null);
const loading = ref(true);
const refreshing = ref(false);
const errorMessage = ref('');
let pollTimer: number | null = null;

const terminalStatuses = new Set(['completed', 'failed', 'expired']);
const orderedStatuses: WorkflowTaskNode['status'][] = [
    'pending',
    'processing',
    'completed',
    'failed',
    'missing'
];

const isTerminal = computed(() => terminalStatuses.has(workflow.value?.status || ''));

const statusCounts = computed(() => {
    const counts: Record<WorkflowTaskNode['status'], number> = {
        pending: 0,
        processing: 0,
        completed: 0,
        failed: 0,
        missing: 0
    };

    for (const task of workflow.value?.tasks || []) counts[task.status] += 1;
    return counts;
});

const progressPercent = computed(() => {
    const tasks = workflow.value?.tasks || [];
    if (tasks.length === 0) return 0;
    return Math.round((statusCounts.value.completed / tasks.length) * 100);
});

const layers = computed<TaskLayer[]>(() => {
    const tasks = workflow.value?.tasks || [];
    const taskMap = new Map(tasks.map(task => [task.taskName, task]));
    const depthCache = new Map<string, number>();

    const getDepth = (taskName: string, stack = new Set<string>()): number => {
        const cached = depthCache.get(taskName);
        if (cached !== undefined) return cached;

        const task = taskMap.get(taskName);
        if (!task || task.fathers.length === 0 || stack.has(taskName)) {
            depthCache.set(taskName, 0);
            return 0;
        }

        stack.add(taskName);
        const depth = Math.max(...task.fathers.map(father => getDepth(father, stack))) + 1;
        stack.delete(taskName);
        depthCache.set(taskName, depth);
        return depth;
    };

    const grouped = new Map<number, WorkflowTaskNode[]>();
    for (const task of tasks) {
        const depth = getDepth(task.taskName);
        grouped.set(depth, [...(grouped.get(depth) || []), task]);
    }

    return [...grouped.entries()]
        .sort(([left], [right]) => left - right)
        .map(([index, items]) => ({
            index,
            tasks: [...items].sort((left, right) => left.taskName.localeCompare(right.taskName))
        }));
});

const trackedResults = computed(() => {
    return Object.entries(workflow.value?.result || {}).map(([taskName, value]) => ({
        taskName,
        done: value !== null,
        name: value?.name || '',
        keys: getObjectKeys(value?.result?.data)
    }));
});

const childrenByTaskName = computed(() => {
    const children: Record<string, string[]> = {};
    for (const task of workflow.value?.tasks || []) {
        children[task.taskName] ||= [];
        for (const father of task.fathers) {
            children[father] ||= [];
            children[father].push(task.taskName);
        }
    }
    return children;
});

async function loadWorkflow(showSpinner = false) {
    if (!workflowId.value) return;
    if (showSpinner) loading.value = true;
    refreshing.value = true;
    errorMessage.value = '';

    try {
        const response = await getWorkflowById(workflowId.value);
        if (response.code !== 200 || !response.data) {
            throw new Error(response.message || '工作流不存在');
        }
        workflow.value = response.data;
        schedulePolling();
    } catch (err: any) {
        errorMessage.value = err.message || '加载失败';
        workflow.value = null;
        stopPolling();
    } finally {
        loading.value = false;
        refreshing.value = false;
    }
}

function schedulePolling() {
    stopPolling();
    if (isTerminal.value) return;
    pollTimer = window.setTimeout(() => loadWorkflow(false), 2000);
}

function stopPolling() {
    if (pollTimer === null) return;
    window.clearTimeout(pollTimer);
    pollTimer = null;
}

function statusLabel(status: string) {
    const labels: Record<string, string> = {
        pending: '等待中',
        active: '运行中',
        processing: '执行中',
        completed: '已完成',
        failed: '失败',
        expired: '已过期',
        missing: '缺失'
    };
    return labels[status] || status;
}

function statusTagType(status: string) {
    if (status === 'completed') return 'success';
    if (status === 'failed' || status === 'expired' || status === 'missing') return 'error';
    if (status === 'processing' || status === 'active') return 'info';
    return 'default';
}

function statusIcon(status: string) {
    if (status === 'completed') return CheckmarkCircleOutline;
    if (status === 'failed' || status === 'missing' || status === 'expired')
        return CloseCircleOutline;
    if (status === 'processing' || status === 'active') return PlayCircleOutline;
    return TimeOutline;
}

function childNames(taskName: string) {
    return childrenByTaskName.value[taskName] || [];
}

function listLabel(names: string[], emptyText: string) {
    return names.length > 0 ? names.join(' / ') : emptyText;
}

function getObjectKeys(value: unknown) {
    if (!value || typeof value !== 'object') return [];
    return Object.keys(value as Record<string, unknown>);
}

async function copyWorkflowId() {
    await navigator.clipboard.writeText(workflowId.value);
    message.success('工作流 ID 已复制');
}

onMounted(() => loadWorkflow(true));
onUnmounted(stopPolling);
</script>

<template>
    <div class="workflow-page">
        <CardTitle
            title="工作流跟踪"
            :icon="GitNetworkOutline"
            class="workflow-title"
            chip="Workflow"
        >
            DAG TASK TRACKING
        </CardTitle>

        <Card class="workflow-overview">
            <n-spin :show="loading">
                <div v-if="workflow" class="overview-content">
                    <div class="overview-main">
                        <div class="workflow-id-line">
                            <span class="label">ID</span>
                            <code>{{ workflow.workflowId }}</code>
                            <n-button size="tiny" quaternary @click="copyWorkflowId">
                                <template #icon>
                                    <n-icon :component="CopyOutline" />
                                </template>
                            </n-button>
                        </div>
                        <div class="overview-meta">
                            <n-tag :type="statusTagType(workflow.status)" :bordered="false">
                                {{ statusLabel(workflow.status) }}
                            </n-tag>
                            <span>{{ formatDate(workflow.createdAt) }}</span>
                            <span>更新于 {{ formatDate(workflow.updatedAt) }}</span>
                        </div>
                    </div>

                    <div class="overview-actions">
                        <n-button size="small" :loading="refreshing" @click="loadWorkflow(false)">
                            <template #icon>
                                <n-icon :component="SyncOutline" />
                            </template>
                            刷新
                        </n-button>
                    </div>

                    <div class="progress-block">
                        <n-progress
                            type="line"
                            :percentage="progressPercent"
                            :indicator-placement="'inside'"
                            processing
                        />
                    </div>

                    <div class="status-grid">
                        <div
                            v-for="status in orderedStatuses"
                            :key="status"
                            class="status-cell"
                            :class="`is-${status}`"
                        >
                            <span>{{ statusLabel(status) }}</span>
                            <strong>{{ statusCounts[status] }}</strong>
                        </div>
                    </div>
                </div>

                <n-empty v-else-if="errorMessage" :description="errorMessage" />
            </n-spin>
        </Card>

        <section v-if="workflow" class="workflow-board">
            <div class="section-heading">
                <h2>执行树</h2>
                <span>{{ workflow.tasks.length }} 个任务</span>
            </div>

            <div class="tree-scroll">
                <div class="workflow-tree" :style="{ '--layer-count': layers.length }">
                    <section v-for="layer in layers" :key="layer.index" class="tree-layer">
                        <div class="layer-label">第 {{ layer.index + 1 }} 层</div>
                        <div class="layer-nodes">
                            <article
                                v-for="task in layer.tasks"
                                :key="task.taskName"
                                class="task-node"
                                :class="`is-${task.status}`"
                            >
                                <div class="node-header">
                                    <div class="node-title">
                                        <n-icon :component="statusIcon(task.status)" />
                                        <strong>{{ task.taskName }}</strong>
                                    </div>
                                    <n-tag size="small" :type="statusTagType(task.status)">
                                        {{ statusLabel(task.status) }}
                                    </n-tag>
                                </div>

                                <div class="node-fields">
                                    <div class="node-field">
                                        <span>类型</span>
                                        <strong>{{ task.type || '未知' }}</strong>
                                    </div>
                                    <div v-if="task.target" class="node-field">
                                        <span>目标</span>
                                        <strong>{{ task.target }}</strong>
                                    </div>
                                </div>

                                <div class="node-meta">
                                    <span v-if="task.track">跟踪结果</span>
                                    <span v-if="task.report">上报进度</span>
                                </div>

                                <div class="dependency-row">
                                    <n-tooltip trigger="hover">
                                        <template #trigger>
                                            <span class="dep-pill">
                                                父节点：{{ task.fathers.length || '入口' }}
                                            </span>
                                        </template>
                                        {{ listLabel(task.fathers, '入口任务') }}
                                    </n-tooltip>
                                    <n-tooltip trigger="hover">
                                        <template #trigger>
                                            <span class="dep-pill is-child">
                                                后继：{{
                                                    childNames(task.taskName).length || '终点'
                                                }}
                                            </span>
                                        </template>
                                        {{ listLabel(childNames(task.taskName), '终点任务') }}
                                    </n-tooltip>
                                </div>

                                <n-tooltip trigger="hover">
                                    <template #trigger>
                                        <div class="node-footer">
                                            <span>{{ task.taskId || 'missing task row' }}</span>
                                        </div>
                                    </template>
                                    <div class="tooltip-content">
                                        <div v-if="task.taskId">{{ task.taskId }}</div>
                                        <div v-if="task.info">{{ task.info }}</div>
                                    </div>
                                </n-tooltip>
                            </article>
                        </div>
                    </section>
                </div>
            </div>
        </section>

        <section v-if="workflow && trackedResults.length > 0" class="tracked-results">
            <div class="section-heading">
                <h2>跟踪结果</h2>
                <span
                    >{{ trackedResults.filter(item => item.done).length }} /
                    {{ trackedResults.length }}</span
                >
            </div>

            <div class="result-list">
                <div v-for="item in trackedResults" :key="item.taskName" class="result-row">
                    <div>
                        <strong>{{ item.taskName }}</strong>
                        <span>{{ item.name || 'pending' }}</span>
                    </div>
                    <n-space size="small" wrap>
                        <n-tag v-if="!item.done" size="small">等待结果</n-tag>
                        <n-tag
                            v-for="key in item.keys"
                            v-else
                            :key="key"
                            size="small"
                            type="success"
                        >
                            {{ key }}
                        </n-tag>
                    </n-space>
                </div>
            </div>
        </section>
    </div>
</template>

<style scoped>
.workflow-page {
    display: flex;
    flex-direction: column;
    gap: 20px;
    width: 100%;
    max-width: 1220px;
    margin: 0 auto;
    color: var(--ui-text-color);
}

.workflow-title {
    margin-bottom: 4px;
}

.workflow-page :deep(.n-tag) {
    display: inline-flex;
    align-items: center;
    justify-content: center;
}

.workflow-page :deep(.n-tag__content) {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    line-height: 1;
}

.workflow-overview {
    min-height: 180px;
}

.overview-content {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 18px;
    align-items: start;
}

.overview-main {
    min-width: 0;
}

.workflow-id-line {
    display: flex;
    align-items: center;
    gap: 8px;
    min-width: 0;
}

.workflow-id-line code {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.label,
.dependency-title {
    font-size: 12px;
    color: var(--ui-muted-text-color);
}

.overview-meta {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    margin-top: 12px;
    color: var(--ui-muted-text-color);
}

.overview-actions {
    display: flex;
    gap: 8px;
    justify-content: flex-end;
}

.progress-block {
    grid-column: 1 / -1;
}

.status-grid {
    grid-column: 1 / -1;
    display: grid;
    grid-template-columns: repeat(5, minmax(92px, 1fr));
    gap: 10px;
}

.status-cell {
    border: 1px solid var(--ui-border-color);
    border-radius: var(--ui-card-radius);
    padding: 10px 12px;
    background: var(--ui-panel-color);
    display: flex;
    align-items: center;
    justify-content: space-between;
}

.status-cell strong {
    font-size: 20px;
}

.status-cell.is-processing {
    border-color: var(--ui-primary-color);
}

.status-cell.is-completed {
    border-color: var(--ui-success-color, #18a058);
}

.status-cell.is-failed,
.status-cell.is-missing {
    border-color: var(--ui-error-color, #d03050);
}

.workflow-board,
.tracked-results {
    display: flex;
    flex-direction: column;
    gap: 12px;
}

.section-heading {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 12px;
}

.section-heading h2 {
    margin: 0;
    font-size: 18px;
    line-height: 1.3;
    color: var(--ui-card-title-color);
}

.section-heading span {
    color: var(--ui-muted-text-color);
    font-size: 13px;
}

.tree-scroll {
    overflow-x: auto;
    padding-bottom: 6px;
}

.workflow-tree {
    min-width: 100%;
    display: flex;
    flex-direction: column;
    gap: 14px;
}

.tree-layer {
    position: relative;
    display: grid;
    grid-template-columns: 92px minmax(0, 1fr);
    gap: 12px;
    align-items: start;
    padding: 2px 0 16px;
}

.tree-layer:not(:last-child)::after {
    content: '';
    position: absolute;
    top: 36px;
    bottom: -10px;
    left: 45px;
    width: 1px;
    background: var(--ui-border-color);
}

.layer-label {
    position: relative;
    z-index: 1;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-height: 32px;
    border: 1px solid var(--ui-border-color);
    border-radius: var(--ui-pill-radius);
    background: var(--ui-card-color);
    color: var(--ui-muted-text-color);
    font-size: 12px;
    white-space: nowrap;
}

.layer-nodes {
    display: flex;
    flex-wrap: wrap;
    align-items: stretch;
    gap: 10px;
    min-width: 0;
}

.task-node {
    position: relative;
    display: flex;
    flex-direction: column;
    flex: 0 1 220px;
    min-width: 200px;
    max-width: 260px;
    border: 1px solid var(--ui-border-color);
    border-radius: var(--ui-card-radius);
    padding: 10px;
    background: var(--ui-card-color);
    box-shadow: var(--ui-card-shadow);
}

.task-node::before {
    content: '';
    position: absolute;
    top: 20px;
    left: -12px;
    width: 12px;
    height: 1px;
    background: var(--ui-border-color);
}

.task-node.is-processing {
    border-color: var(--ui-primary-color);
}

.task-node.is-completed {
    border-color: var(--ui-success-color, #18a058);
}

.task-node.is-failed,
.task-node.is-missing {
    border-color: var(--ui-error-color, #d03050);
}

.node-header,
.node-title,
.node-meta,
.node-footer {
    display: flex;
    align-items: center;
}

.node-header {
    justify-content: space-between;
    gap: 8px;
}

.node-title {
    gap: 6px;
    min-width: 0;
}

.node-title strong {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.node-title strong {
    font-size: 13px;
}

.node-fields {
    display: grid;
    grid-template-columns: 1fr;
    gap: 4px;
    margin-top: 8px;
}

.node-field {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    min-width: 0;
    font-size: 12px;
}

.node-field span {
    flex: 0 0 auto;
    color: var(--ui-muted-text-color);
}

.node-field strong {
    min-width: 0;
    overflow: hidden;
    text-align: right;
    text-overflow: ellipsis;
    white-space: nowrap;
    color: var(--ui-card-title-color);
}

.node-meta {
    flex-wrap: wrap;
    gap: 5px;
    margin-top: 8px;
}

.node-meta span {
    font-size: 12px;
    padding: 1px 6px;
    border-radius: var(--ui-card-radius);
    background: var(--ui-mark-background-color);
    color: var(--ui-muted-text-color);
}

.dependency-row {
    display: flex;
    flex-wrap: wrap;
    gap: 5px;
    margin-top: 8px;
    margin-bottom: 8px;
}

.dep-pill {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    max-width: 100%;
    min-height: 22px;
    padding: 2px 7px;
    border: 1px solid var(--ui-border-color);
    border-radius: var(--ui-pill-radius);
    background: var(--ui-panel-color);
    font-size: 12px;
    color: var(--ui-muted-text-color);
    cursor: help;
}

.dep-pill.is-child {
    color: var(--ui-primary-color);
    border-color: var(--ui-primary-color-suppl);
}

.node-footer {
    margin-top: auto;
    padding-top: 8px;
    border-top: 1px solid var(--ui-border-color);
    color: var(--ui-muted-text-color);
    font-size: 11px;
}

.node-footer span {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.tooltip-content {
    max-width: 360px;
    word-break: break-all;
}

.result-list {
    display: grid;
    gap: 10px;
}

.result-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 12px 14px;
    border: 1px solid var(--ui-border-color);
    border-radius: var(--ui-card-radius);
    background: var(--ui-card-color);
}

.result-row > div:first-child {
    display: flex;
    flex-direction: column;
    gap: 4px;
    min-width: 0;
}

.result-row strong {
    color: var(--ui-card-title-color);
}

.result-row span {
    color: var(--ui-muted-text-color);
    font-size: 12px;
}

@media (max-width: 720px) {
    .overview-content {
        grid-template-columns: 1fr;
    }

    .overview-actions {
        justify-content: flex-start;
        flex-wrap: wrap;
    }

    .status-grid {
        grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .workflow-tree {
        min-width: 100%;
    }

    .tree-layer {
        grid-template-columns: 1fr;
        gap: 8px;
    }

    .tree-layer:not(:last-child)::after,
    .task-node::before {
        display: none;
    }

    .layer-label {
        justify-self: start;
        padding: 0 12px;
    }

    .task-node {
        flex-basis: 100%;
        max-width: none;
    }

    .result-row {
        align-items: flex-start;
        flex-direction: column;
    }
}
</style>
