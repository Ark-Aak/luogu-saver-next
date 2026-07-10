<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import {
    NButton,
    NDivider,
    NIcon,
    NSkeleton,
    NSpace,
    NSpin,
    NTag,
    useDialog,
    useMessage
} from 'naive-ui';
import {
    ArrowBackOutline,
    CalendarOutline,
    ClipboardOutline,
    CopyOutline,
    OpenOutline,
    SyncOutline,
    TrashOutline
} from '@vicons/ionicons5';

import { getPasteById, savePaste } from '@/api/paste';
import type { Paste } from '@/types/paste';
import { useContentSaver } from '@/composables/useContentSaver';
import Card from '@/components/Card.vue';
import LoadingSkeleton from '@/components/LoadingSkeleton.vue';
import MarkdownViewer from '@/components/MarkdownViewer.vue';
import UserLink from '@/components/UserLink.vue';
import DeletionRequestModal from '@/components/DeletionRequestModal.vue';
import { formatDate } from '@/utils/render';
import { useLuoguSource } from '@/utils/luogu-source.ts';
import { isAuthenticated, startCpOAuthLogin } from '@/utils/auth.ts';

const route = useRoute();
const router = useRouter();
const message = useMessage();
const dialog = useDialog();
const {
    isSaving,
    hasUpdate,
    handle404,
    setupUpdateListener,
    setupTaskUpdateListener,
    handleRefresh,
    notifyWorkflowSubmitted
} = useContentSaver();

const pasteId = route.params.id as string;
const paste = ref<Paste | null>(null);
const loading = ref(true);
const displayContent = ref('');
const { buildLuoguUrl } = useLuoguSource();
let stopTaskListener: (() => void) | null = null;

const title = computed(() => `剪贴板 ${pasteId}`);

const triggerRefresh = () => {
    handleRefresh(loadData);
};

const getSaveReportTaskId = (response: Awaited<ReturnType<typeof savePaste>>) => {
    if (response.code !== 200 || !response.data?.reportTaskIds?.save) {
        throw new Error(response.message || '保存请求提交失败');
    }

    return response.data.reportTaskIds.save;
};

const trackSaveTask = (taskId?: string) => {
    if (!taskId) return;
    stopTaskListener?.();
    stopTaskListener = setupTaskUpdateListener(
        taskId,
        () => {
            stopTaskListener = null;
            message.success('保存任务处理完成');
        },
        error => {
            stopTaskListener = null;
            dialog.error({
                title: '保存失败',
                content: error || '剪贴板保存过程中出现错误，请重试。',
                positiveText: '重试',
                negativeText: '取消',
                onPositiveClick: async () => {
                    const response = await savePaste(pasteId);
                    trackSaveTask(getSaveReportTaskId(response));
                    notifyWorkflowSubmitted(response, '重试请求已提交');
                },
                maskClosable: false,
                closable: false,
                closeOnEsc: false
            });
        }
    );
};

const submitSavePaste = async () => {
    const response = await savePaste(pasteId);
    trackSaveTask(getSaveReportTaskId(response));
    return response;
};

const loadData = async () => {
    loading.value = true;
    try {
        const res = await getPasteById(pasteId);
        if (res.code === 404) {
            handle404(submitSavePaste);
            return;
        }

        paste.value = res.data;
        displayContent.value = paste.value?.renderedContent || '';
    } catch (err: any) {
        message.error(err.message || '加载失败');
    } finally {
        loading.value = false;
    }
};

setupUpdateListener(`paste_${pasteId}`, `paste:${pasteId}:updated`, loadData);

const handleCopy = async () => {
    if (!paste.value?.content) return;

    try {
        await navigator.clipboard.writeText(paste.value.content);
        message.success('源码已复制到剪贴板');
    } catch {
        message.error('复制失败');
    }
};

const handleUpdate = async () => {
    if (!pasteId) return;
    try {
        const response = await submitSavePaste();
        notifyWorkflowSubmitted(response, '更新请求已提交');
    } catch (err: any) {
        message.error(err.message || '更新请求失败');
    }
};

const showDeletionModal = ref(false);

const handleDelete = () => {
    if (!isAuthenticated.value) {
        dialog.warning({
            title: '需要登录',
            content: '提交删除申请需要登录，是否前往登录？',
            positiveText: '去登录',
            negativeText: '取消',
            onPositiveClick: () => startCpOAuthLogin(`/paste/${pasteId}`)
        });
        return;
    }
    showDeletionModal.value = true;
};

onMounted(() => {
    loadData();
});
</script>

<template>
    <n-spin :show="isSaving" description="正在保存并处理..." class="saving-spin">
        <div class="paste-layout">
            <aside class="sidebar-left"></aside>

            <div class="center-column">
                <div class="paste-header">
                    <LoadingSkeleton :loading="loading">
                        <template #skeleton>
                            <Card>
                                <div style="margin-bottom: 8px">
                                    <n-skeleton
                                        text
                                        style="width: 40%; height: 28px; margin-bottom: 8px"
                                    />
                                </div>
                                <n-divider style="margin: 12px 0" />
                                <div class="info-grid">
                                    <div class="info-item">
                                        <span class="label">作者</span>
                                        <div class="skeleton-line">
                                            <n-skeleton circle size="small" />
                                            <n-skeleton text style="width: 80px" />
                                        </div>
                                    </div>
                                    <div class="info-item"></div>
                                </div>
                            </Card>
                        </template>

                        <div v-if="paste">
                            <Card :title="title" :icon="ClipboardOutline">
                                <div class="meta-row">
                                    <n-tag :bordered="false" size="small">
                                        <template #icon>
                                            <NIcon :component="CalendarOutline" />
                                        </template>
                                        更新于 {{ formatDate(paste.updatedAt) }}
                                    </n-tag>
                                </div>

                                <n-divider style="margin: 12px 0" />

                                <div class="info-grid">
                                    <div class="info-item">
                                        <span class="label">作者</span>
                                        <UserLink :user="paste.author" show-avatar />
                                    </div>
                                    <div class="info-item"></div>
                                </div>

                                <n-divider style="margin: 12px 0" />

                                <n-space>
                                    <n-button size="small" @click="router.go(-1)">
                                        <template #icon>
                                            <NIcon :component="ArrowBackOutline" />
                                        </template>
                                        返回
                                    </n-button>
                                    <n-button
                                        size="small"
                                        secondary
                                        tag="a"
                                        :href="buildLuoguUrl(`/paste/${paste.id}`)"
                                        target="_blank"
                                    >
                                        <template #icon>
                                            <NIcon :component="OpenOutline" />
                                        </template>
                                        原站
                                    </n-button>
                                    <n-button size="small" secondary @click="handleCopy">
                                        <template #icon>
                                            <NIcon :component="CopyOutline" />
                                        </template>
                                        源码
                                    </n-button>
                                    <n-button size="small" type="primary" @click="handleUpdate">
                                        <template #icon>
                                            <NIcon :component="SyncOutline" />
                                        </template>
                                        更新
                                    </n-button>
                                    <n-button size="small" type="error" ghost @click="handleDelete">
                                        <template #icon>
                                            <NIcon :component="TrashOutline" />
                                        </template>
                                        删除
                                    </n-button>
                                </n-space>
                            </Card>
                        </div>
                    </LoadingSkeleton>
                </div>

                <main class="main-content">
                    <div>
                        <LoadingSkeleton :loading="loading">
                            <template #skeleton>
                                <Card>
                                    <n-space vertical size="large">
                                        <n-space vertical>
                                            <n-skeleton text :repeat="2" />
                                            <n-skeleton text style="width: 60%" />
                                        </n-space>
                                        <n-skeleton
                                            height="120px"
                                            style="border-radius: var(--ui-card-radius)"
                                        />
                                        <n-space vertical>
                                            <n-skeleton text :repeat="4" />
                                        </n-space>
                                    </n-space>
                                </Card>
                            </template>

                            <Card v-if="paste">
                                <MarkdownViewer :content="displayContent" :pre-rendered="true" />
                            </Card>
                        </LoadingSkeleton>
                    </div>
                </main>
            </div>

            <aside class="sidebar-right"></aside>
        </div>
    </n-spin>

    <div v-if="hasUpdate" class="update-floater">
        <n-button type="primary" circle size="large" class="shadow-button" @click="triggerRefresh">
            <template #icon>
                <NIcon :component="SyncOutline" />
            </template>
        </n-button>
    </div>

    <DeletionRequestModal
        v-model:show="showDeletionModal"
        target-type="paste"
        :target-id="pasteId"
    />
</template>

<style scoped>
.sidebar-left,
.sidebar-right {
    display: block;
}

.paste-layout {
    width: min(100%, 1600px);
    max-width: none;
    margin: 0 auto;
    display: grid;
    grid-template-columns: 280px minmax(0, 1fr) 280px;
    gap: 20px;
    align-items: start;
}

.sidebar-left,
.sidebar-right,
.main-content {
    min-width: 0;
}

.center-column {
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 16px;
}

.meta-row {
    margin-bottom: 8px;
    display: flex;
    gap: 8px;
}

.info-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 12px;
}

.info-item {
    min-height: 58px;
    background: linear-gradient(180deg, var(--ui-panel-color), var(--ui-body-gradient-end));
    padding: 10px 12px;
    border-radius: var(--ui-card-radius);
    border: 1px solid var(--ui-border-color);
    display: flex;
    flex-direction: column;
    gap: 4px;
}

.label {
    font-size: 12px;
    color: var(--ui-muted-text-color);
}

.skeleton-line {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-top: 4px;
}

.update-floater {
    position: fixed;
    bottom: 32px;
    left: 260px;
    z-index: 999;
    animation: slide-in 0.3s ease-out;
}

.shadow-button {
    box-shadow: var(--ui-elevated-shadow);
}

@keyframes slide-in {
    from {
        transform: translateY(100%);
        opacity: 0;
    }
    to {
        transform: translateY(0);
        opacity: 1;
    }
}

@media (max-width: 1200px) {
    .paste-layout {
        grid-template-columns: minmax(0, 1fr);
    }

    .sidebar-left,
    .sidebar-right {
        min-width: 0;
    }
}

@media (max-width: 640px) {
    .info-grid {
        grid-template-columns: minmax(0, 1fr);
    }
}

/* noinspection CssUnusedSymbol */
.saving-spin :deep(.n-spin-body) {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
}
</style>
