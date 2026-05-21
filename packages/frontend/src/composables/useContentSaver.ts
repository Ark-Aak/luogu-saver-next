import { ref, onUnmounted } from 'vue';
import { useDialog, useMessage } from 'naive-ui';
import { useRouter } from 'vue-router';
import socket from '@/utils/websocket';

export function useContentSaver() {
    const dialog = useDialog();
    const message = useMessage();
    const router = useRouter();
    const isSaving = ref(false);
    const hasUpdate = ref(false);
    const cleanupCallbacks = new Set<() => void>();
    let updateDialogOpen = false;

    const addCleanup = (cleanup: () => void) => {
        cleanupCallbacks.add(cleanup);
    };

    onUnmounted(() => {
        for (const cleanup of cleanupCallbacks) {
            cleanup();
        }
        cleanupCallbacks.clear();
    });

    const handle404 = (saveAction: () => Promise<any>, onCancel?: () => void) => {
        dialog.warning({
            title: '内容未找到',
            content: '该内容尚未被收录，是否立即保存？',
            positiveText: '立即保存',
            negativeText: '返回',
            closable: false,
            closeOnEsc: false,
            maskClosable: false,
            onPositiveClick: async () => {
                try {
                    isSaving.value = true;
                    const res = await saveAction();
                    const taskId = res?.data?.taskId;
                    message.success(taskId ? `保存任务已提交: ${taskId}` : '保存任务已提交');
                } catch (e: any) {
                    message.error(e.message || '保存失败');
                    isSaving.value = false;
                }
            },
            onNegativeClick: () => {
                if (onCancel) onCancel();
                else router.back();
            }
        });
    };

    const stopSaving = () => {
        isSaving.value = false;
    };

    const setupUpdateListener = (room: string, event: string, onRefresh: () => void) => {
        socket.joinRoom(room);

        const handleUpdate = () => {
            stopSaving();
            hasUpdate.value = true;
            if (updateDialogOpen) return;
            updateDialogOpen = true;
            dialog.info({
                title: '内容已更新',
                content: '检测到当前内容有新的版本，是否立即刷新页面以查看最新内容？',
                positiveText: '刷新',
                negativeText: '稍后',
                onPositiveClick: () => {
                    updateDialogOpen = false;
                    hasUpdate.value = false;
                    onRefresh();
                },
                onNegativeClick: () => {
                    updateDialogOpen = false;
                }
            });
        };

        socket.getInstance().on(event, handleUpdate);

        addCleanup(() => {
            socket.getInstance().off(event, handleUpdate);
            socket.leaveRoom(room);
        });
    };

    const setupTaskUpdateListener = (
        taskId: string,
        onComplete: (data?: any) => void,
        onFail: (error: string) => void
    ) => {
        if (!taskId) return () => {};

        const roomId = `task:${taskId}`;
        const completeEvent = `task:${taskId}:completed`;
        const failEvent = `task:${taskId}:failed`;
        socket.joinRoom(roomId);

        let active = true;
        socket.getInstance().on(completeEvent, handleComplete);
        socket.getInstance().on(failEvent, handleFail);

        addCleanup(cleanup);
        return cleanup;

        function cleanup() {
            if (!active) return;
            active = false;
            socket.getInstance().off(completeEvent, handleComplete);
            socket.getInstance().off(failEvent, handleFail);
            socket.leaveRoom(roomId);
            cleanupCallbacks.delete(cleanup);
        }

        function handleComplete(data?: any) {
            stopSaving();
            onComplete(data);
            cleanup();
        }

        function handleFail(data: { error: string }) {
            stopSaving();
            onFail(data.error);
            cleanup();
        }
    };

    const handleRefresh = (onRefresh: () => void) => {
        hasUpdate.value = false;
        onRefresh();
    };

    return {
        isSaving,
        hasUpdate,
        handle404,
        stopSaving,
        setupUpdateListener,
        setupTaskUpdateListener,
        handleRefresh
    };
}
