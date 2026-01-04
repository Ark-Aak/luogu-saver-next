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
            dialog.info({
                title: '内容已更新',
                content: '检测到当前内容有新的版本，是否立即刷新页面以查看最新内容？',
                positiveText: '刷新',
                negativeText: '稍后',
                onPositiveClick: () => {
                    hasUpdate.value = false;
                    onRefresh();
                }
            });
        };

        socket.getInstance().on(event, handleUpdate);

        onUnmounted(() => {
            socket.getInstance().off(event, handleUpdate);
            socket.leaveRoom(room);
        });
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
        handleRefresh
    };
}
