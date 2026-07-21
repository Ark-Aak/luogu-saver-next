<script setup lang="ts">
import { computed, ref } from 'vue';
import { NButton, NIcon, NInput, NPopover, NTimeline, NTimelineItem, useMessage } from 'naive-ui';
import { List, Star, Clock3, Trash2, Settings } from 'lucide-vue-next';
import SidebarWidget from '@/components/SidebarWidget.vue';
import type { TocItem } from '@/types/article';
import type { Bookmark } from '@/composables/useBookmarks';
import { formatDate } from '@/utils/render';

interface VersionItem {
    version: number;
    createdAt: string;
    title?: string;
}

const props = defineProps<{
    tocItems: TocItem[];
    bookmarks: Bookmark[];
    versionHistory: VersionItem[];
    selectedVersion: number | null;
    contentId: string;
}>();

const emit = defineEmits<{
    'add-bookmark': [headingId: string, headingText: string];
    'remove-bookmark': [bookmarkId: string];
    'rename-bookmark': [bookmarkId: string, newName: string];
    'select-version': [version: number];
    'scroll-to': [headingId: string];
}>();

const message = useMessage();
const versionPopoverVisible = ref(false);

const flattenToc = (items: TocItem[]): TocItem[] => {
    const result: TocItem[] = [];
    const walk = (list: TocItem[]) => {
        for (const item of list) {
            result.push(item);
            if (item.children && item.children.length > 0) {
                walk(item.children);
            }
        }
    };
    walk(items);
    return result;
};

const flatToc = computed(() => flattenToc(props.tocItems));

const isHeadingBookmarked = (headingId: string): boolean => {
    return props.bookmarks.some(b => b.headingId === headingId);
};

const editingBookmarkId = ref<string | null>(null);
const editingBookmarkName = ref('');

const startRename = (bookmark: Bookmark) => {
    editingBookmarkId.value = bookmark.id;
    editingBookmarkName.value = bookmark.name;
};

const confirmRename = (bookmarkId: string) => {
    const name = editingBookmarkName.value.trim();
    if (!name) {
        message.warning('段落收藏名称不能为空');
        return;
    }
    emit('rename-bookmark', bookmarkId, name);
    editingBookmarkId.value = null;
};

const cancelRename = () => {
    editingBookmarkId.value = null;
};

const handleScrollTo = (headingId: string) => {
    const el = document.getElementById(headingId);
    if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    emit('scroll-to', headingId);
};

const handleTocCollect = (headingId: string, headingText: string, e: MouseEvent) => {
    e.stopPropagation();
    emit('add-bookmark', headingId, headingText);
};
</script>

<template>
    <div class="focus-sidebar">
        <SidebarWidget
            v-if="versionHistory.length > 0"
            title="历史版本"
            :icon="Clock3"
            class="version-card"
        >
            <n-popover
                v-model:show="versionPopoverVisible"
                trigger="click"
                placement="bottom-end"
                :width="320"
            >
                <template #trigger>
                    <n-button size="small" secondary block>
                        <template #icon>
                            <NIcon :component="Clock3" />
                        </template>
                        {{ selectedVersion ? `版本 ${selectedVersion}` : '选择版本' }}
                    </n-button>
                </template>
                <n-timeline class="version-timeline-popover">
                    <n-timeline-item
                        v-for="ver in versionHistory"
                        :key="ver.version"
                        :title="`版本 ${ver.version}`"
                        :content="ver.title"
                        :time="formatDate(ver.createdAt)"
                        :type="selectedVersion === ver.version ? 'success' : 'default'"
                        class="version-timeline-item"
                        @click="
                            emit('select-version', ver.version);
                            versionPopoverVisible = false;
                        "
                    />
                </n-timeline>
            </n-popover>
        </SidebarWidget>

        <SidebarWidget v-if="tocItems.length > 0" title="目录" :icon="List" class="toc-card">
            <div class="toc-list">
                <div v-for="item in flatToc" :key="item.href" class="toc-item">
                    <button class="toc-item-link" @click="handleScrollTo(item.href.slice(1))">
                        {{ item.title }}
                    </button>
                    <n-button
                        text
                        size="tiny"
                        class="toc-collect-btn"
                        :class="{
                            'toc-collect-btn--active': isHeadingBookmarked(item.href.slice(1))
                        }"
                        @click.stop="handleTocCollect(item.href.slice(1), item.title, $event)"
                    >
                        <template #icon>
                            <NIcon :component="Star" />
                        </template>
                    </n-button>
                </div>
            </div>
        </SidebarWidget>

        <SidebarWidget title="段落收藏" :icon="Star" class="bookmarks-card">
            <div v-if="bookmarks.length === 0" class="bookmarks-empty">
                暂无段落收藏。点击标题旁的星标图标或目录中的收藏按钮即可添加。
            </div>

            <div v-else class="bookmarks-list">
                <div v-for="bm in bookmarks" :key="bm.id" class="bookmark-item">
                    <div v-if="editingBookmarkId !== bm.id" class="bookmark-row">
                        <button class="bookmark-link" @click="handleScrollTo(bm.headingId)">
                            {{ bm.name }}
                        </button>
                        <div class="bookmark-actions">
                            <n-button text size="tiny" @click.stop="startRename(bm)">
                                <template #icon>
                                    <NIcon :component="Settings" />
                                </template>
                            </n-button>
                            <n-button
                                text
                                size="tiny"
                                type="error"
                                @click.stop="emit('remove-bookmark', bm.id)"
                            >
                                <template #icon>
                                    <NIcon :component="Trash2" />
                                </template>
                            </n-button>
                        </div>
                    </div>
                    <div v-else class="bookmark-edit-row">
                        <n-input
                            v-model:value="editingBookmarkName"
                            size="tiny"
                            autofocus
                            @keyup.enter="confirmRename(bm.id)"
                            @keyup.escape="cancelRename"
                        />
                        <n-button size="tiny" type="primary" @click="confirmRename(bm.id)">
                            确定
                        </n-button>
                        <n-button size="tiny" @click="cancelRename"> 取消 </n-button>
                    </div>
                </div>
            </div>
        </SidebarWidget>
    </div>
</template>

<style scoped>
.focus-sidebar {
    display: flex;
    flex-direction: column;
    gap: 0;
}

.toc-card {
    margin-top: 0;
    max-height: 50vh;
    display: flex;
    flex-direction: column;
    overflow: hidden;
}

.toc-card :deep(.widget-content) {
    flex: 1 1 auto;
    min-height: 0;
    overflow-x: hidden;
    overflow-y: auto;
    padding: 0;
}

.version-card {
    margin-top: 0;
}

.bookmarks-card {
    margin-top: 0;
}

.bookmarks-empty {
    color: var(--ui-muted-text-color);
    font-size: 13px;
    line-height: 1.6;
}

.bookmarks-list {
    display: flex;
    flex-direction: column;
    gap: 4px;
    max-height: 40vh;
    overflow-y: auto;
}

.bookmark-item {
    border-radius: var(--ui-card-radius);
    transition: background-color 0.15s ease;
}

.bookmark-item:hover {
    background: var(--ui-panel-color);
}

.bookmark-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 4px 6px;
}

.bookmark-link {
    background: none;
    border: none;
    padding: 0;
    color: var(--ui-text-color);
    font-size: 13px;
    cursor: pointer;
    text-align: left;
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    line-height: 1.5;
}

.bookmark-link:hover {
    color: var(--ui-primary-color);
}

.bookmark-actions {
    display: flex;
    gap: 2px;
    opacity: 0;
    transition: opacity 0.15s ease;
    flex-shrink: 0;
}

.bookmark-item:hover .bookmark-actions {
    opacity: 1;
}

.bookmark-edit-row {
    display: flex;
    gap: 4px;
    align-items: center;
    padding: 4px 6px;
}

.bookmark-edit-row :deep(.n-input) {
    flex: 1;
}

.version-timeline-popover {
    max-height: 360px;
    overflow-y: auto;
    padding: 4px;
}

.version-timeline-item {
    cursor: pointer;
}

.version-timeline-item:hover {
    background: var(--ui-panel-color);
    border-radius: var(--ui-card-radius);
}

/* TOC custom list styles */
.toc-list {
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding: 2px;
}

.toc-item {
    display: flex;
    align-items: center;
    border-radius: var(--ui-card-radius);
    transition: background-color 0.2s ease;
}

.toc-item:hover {
    background: var(--ui-panel-color);
}

.toc-item-link {
    flex: 1;
    min-width: 0;
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 5px 10px;
    background: none;
    border: none;
    color: var(--ui-text-color);
    font-size: 13px;
    line-height: 1.35;
    cursor: pointer;
    text-align: left;
    white-space: normal;
    overflow: hidden;
    border-radius: var(--ui-card-radius);
    transition:
        background-color 0.2s ease,
        color 0.2s ease;
}

.toc-item-link::before {
    content: '';
    flex: 0 0 auto;
    width: 6px;
    height: 6px;
    border-radius: var(--ui-pill-radius);
    background: var(--ui-muted-accent-color);
}

.toc-item-link:hover {
    color: var(--ui-text-color);
}

.toc-collect-btn {
    flex-shrink: 0;
    opacity: 0;
    transition: opacity 0.15s ease;
    padding: 2px 6px;
    margin-right: 4px;
    color: var(--ui-muted-text-color);
}

.toc-item:hover .toc-collect-btn {
    opacity: 1;
}

.toc-collect-btn:hover {
    color: var(--ui-primary-color) !important;
}

.toc-collect-btn--active {
    opacity: 1;
    color: var(--ui-primary-color) !important;
}
</style>
