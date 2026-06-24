<script setup lang="ts">
import { ref, onMounted, nextTick, watch } from 'vue';
import 'katex/dist/katex.min.css';
import '@/styles/markdown.css';
import { renderMarkdown } from '@/api/markdown.ts';

const props = defineProps<{
    content?: string;
    loading?: boolean;
    preRendered?: boolean;
}>();

const emit = defineEmits<{
    rendered: [html: string];
}>();

const contentRef = ref<HTMLElement | null>(null);
const renderedContent = ref('');

const CARET_RIGHT_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640">
<!--!Font Awesome Pro v7.1.0 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license (Commercial License) Copyright 2025 Fonticons, Inc.-->
<path d="M441.3 299.8C451.5 312.4 450.8 330.9 439.1 342.6L311.1 470.6C301.9 479.8 288.2 482.5 276.2 477.5C264.2 472.5 256.5 460.9 256.5 448L256.5 192C256.5 179.1 264.3 167.4 276.3 162.4C288.3 157.4 302 160.2 311.2 169.3L439.2 297.3L441.4 299.7z"/></svg>
`;

const COPY_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
</svg>
`;

const CHECK_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <polyline points="20 6 9 17 4 12"></polyline>
</svg>
`;

const toggleMarkdownBlock = (event: Event) => {
    const title = event.currentTarget as HTMLElement;
    const body = title.nextElementSibling as HTMLElement | null;
    const btn = title.querySelector('.toggle-btn');
    if (!body || !btn) return;

    const isHidden = body.style.display === 'none';
    body.style.display = isHidden ? 'block' : 'none';
    btn.classList.toggle('expanded', isHidden);
};

const initMarkdownBlocks = () => {
    if (!contentRef.value) return;

    contentRef.value.querySelectorAll('.md-block .md-block-title').forEach(title => {
        const btn = title.querySelector('.toggle-btn');
        if (!btn) return;

        btn.className = 'toggle-btn';

        btn.innerHTML = CARET_RIGHT_SVG;

        const body = title.nextElementSibling as HTMLElement;
        if (body && body.style.display !== 'none') {
            btn.classList.add('expanded');
        }

        title.removeEventListener('click', toggleMarkdownBlock);
        title.addEventListener('click', toggleMarkdownBlock);
    });
};

const addCopyButtons = () => {
    if (!contentRef.value) return;

    // 移除可能残留的复制按钮
    const existingButtons = contentRef.value.querySelectorAll('.copy-code-btn');
    existingButtons.forEach(btn => btn.remove());

    const codeBlocks = contentRef.value.querySelectorAll('pre');
    codeBlocks.forEach(pre => {
        // 确保 pre 是相对定位容器
        if (getComputedStyle(pre).position !== 'relative') {
            pre.style.position = 'relative';
        }

        const button = document.createElement('button');
        button.className = 'copy-code-btn';
        button.innerHTML = COPY_SVG;
        button.title = '复制代码';

        button.addEventListener('click', async e => {
            e.stopPropagation();
            // 获取代码文本：优先取 code 内的文本，否则取 pre 内的文本
            const codeElement = pre.querySelector('code');
            const codeText = codeElement ? codeElement.innerText : pre.innerText;

            try {
                await navigator.clipboard.writeText(codeText);
                // 临时显示成功图标
                const originalHTML = button.innerHTML;
                button.innerHTML = CHECK_SVG;
                setTimeout(() => {
                    button.innerHTML = originalHTML;
                }, 1500);
            } catch (err) {
                console.error('复制失败:', err);
                // 可选：显示错误提示
            }
        });

        pre.appendChild(button);
    });
};

const processContent = async () => {
    if (!props.content) {
        renderedContent.value = '';
        return;
    }

    if (props.preRendered === false) {
        const rendered = await renderMarkdown(props.content);
        renderedContent.value = rendered.data.html;
    } else {
        renderedContent.value = props.content;
    }

    await nextTick();
    initMarkdownBlocks();
    addCopyButtons();
    emit('rendered', renderedContent.value);
};

watch(() => [props.content, props.preRendered], processContent);

onMounted(processContent);
</script>

<template>
    <div class="md-container">
        <div v-if="loading" class="empty-tip">加载中...</div>
        <div v-else-if="!renderedContent" class="empty-tip">暂无内容</div>
        <!-- eslint-disable-next-line vue/no-v-html -->
        <div v-else ref="contentRef" class="md-body" v-html="renderedContent"></div>
    </div>
</template>

<style scoped>
/* 添加代码块复制按钮样式 */
.md-body :deep(pre) {
    position: relative;
}

.md-body :deep(.copy-code-btn) {
    position: absolute;
    top: 8px;
    right: 8px;
    padding: 4px 6px;
    background: var(--ui-copy-button-background-color);
    backdrop-filter: blur(4px);
    border: none;
    border-radius: var(--ui-card-radius);
    cursor: pointer;
    opacity: 0;
    transition:
        opacity 0.2s ease,
        background 0.2s ease;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--ui-copy-button-text-color);
    box-shadow: var(--ui-elevated-shadow);
    z-index: 2;
}

.md-body :deep(pre:hover .copy-code-btn) {
    opacity: 1;
}

.md-body :deep(.copy-code-btn:hover) {
    background: var(--ui-copy-button-background-color);
    color: var(--ui-primary-color);
}

.md-body :deep(.copy-code-btn svg) {
    display: block;
}
</style>
