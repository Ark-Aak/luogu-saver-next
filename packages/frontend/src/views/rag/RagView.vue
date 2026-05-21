<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';
import { NAlert, NButton, NInput, NSpace, NTag, useMessage } from 'naive-ui';
import { ChatbubbleEllipsesOutline, NewspaperOutline } from '@vicons/ionicons5';
import CardTitle from '@/components/CardTitle.vue';
import Card from '@/components/Card.vue';
import MarkdownViewer from '@/components/MarkdownViewer.vue';
import { createWorkflowFromTemplate, getWorkflowById } from '@/api/workflow.ts';
import { renderMarkdown } from '@/api/markdown.ts';
import { useContentSaver } from '@/composables/useContentSaver.ts';
import { isAuthenticated, startCpOAuthLogin } from '@/utils/auth.ts';

type RagDocument = {
    id: string;
    title: string;
    score: number;
    sources: string[];
};

const message = useMessage();
const router = useRouter();
const question = ref('');
const loading = ref(false);
const answerMarkdown = ref('');
const answerHtml = ref('');
const documents = ref<RagDocument[]>([]);
const { setupTaskUpdateListener } = useContentSaver();

const canAsk = computed(() => question.value.trim().length > 0 && !loading.value);

async function showAnswer(answer: any) {
    answerMarkdown.value = answer?.text || '';
    documents.value = answer?.documents || [];
    const rendered = await renderMarkdown(answerMarkdown.value);
    answerHtml.value = rendered.data.html;
}

async function loadWorkflowAnswer(workflowId: string) {
    for (let attempt = 0; attempt < 5; attempt++) {
        const workflow = await getWorkflowById(workflowId);
        const answer = workflow.data?.result?.answer?.result?.data;
        if (answer?.text) return answer;
        await new Promise(resolve => setTimeout(resolve, 200));
    }
    return null;
}

async function askRag() {
    if (!question.value.trim()) {
        message.warning('请输入问题');
        return;
    }
    if (!isAuthenticated.value) {
        message.warning('RAG 问答需要登录');
        startCpOAuthLogin('/rag');
        return;
    }

    loading.value = true;
    answerMarkdown.value = '';
    answerHtml.value = '';
    documents.value = [];

    const response = await createWorkflowFromTemplate('rag-search-pipeline', {
        query: question.value,
        limit: 10,
        maxArticles: 6,
        maxChars: 8000
    });

    if (response.code !== 200) {
        loading.value = false;
        message.error(response.message);
        return;
    }

    setupTaskUpdateListener(
        response.data.reportTaskIds.answer,
        async data => {
            const answer =
                data?.result?.data || (await loadWorkflowAnswer(response.data.workflowId));
            if (!answer?.text) {
                message.error('RAG 问答完成，但没有返回内容');
                loading.value = false;
                return;
            }
            await showAnswer(answer);
            loading.value = false;
            message.success('RAG 问答完成');
        },
        error => {
            loading.value = false;
            message.error(error || 'RAG 问答失败');
        }
    );

    message.success('RAG 问答任务已提交');
}

function openArticle(id: string) {
    router.push(`/article/${id}`);
}
</script>

<template>
    <div class="rag-page">
        <CardTitle title="RAG 问答" :icon="ChatbubbleEllipsesOutline" class="rag-header" chip="RAG">
            RETRIEVAL AUGMENTED QA
        </CardTitle>

        <Card class="question-card">
            <n-space vertical size="medium">
                <n-alert v-if="!isAuthenticated" type="warning" title="需要登录">
                    RAG 问答会调用 LLM，需要先登录。
                    <template #action>
                        <n-button size="small" @click="startCpOAuthLogin('/rag')">登录</n-button>
                    </template>
                </n-alert>
                <n-input
                    v-model:value="question"
                    type="textarea"
                    :autosize="{ minRows: 3, maxRows: 6 }"
                    placeholder="输入你想基于站内文章询问的问题"
                    @keydown.ctrl.enter="askRag"
                />
                <div class="actions">
                    <span class="hint">Ctrl + Enter 提交</span>
                    <n-button type="primary" :loading="loading" :disabled="!canAsk" @click="askRag">
                        开始问答
                    </n-button>
                </div>
            </n-space>
        </Card>

        <Card v-if="loading || answerHtml" title="回答" class="answer-card">
            <MarkdownViewer :content="answerHtml" :loading="loading" />
        </Card>

        <Card
            v-if="documents.length"
            title="引用文章"
            :icon="NewspaperOutline"
            class="sources-card"
        >
            <div class="sources-grid">
                <div
                    v-for="doc in documents"
                    :key="doc.id"
                    class="source-item"
                    @click="openArticle(doc.id)"
                >
                    <div class="source-title">{{ doc.title }}</div>
                    <n-space size="small">
                        <n-tag size="small" :bordered="false">{{ doc.id }}</n-tag>
                        <n-tag
                            v-for="source in doc.sources"
                            :key="source"
                            size="small"
                            :bordered="false"
                            type="info"
                        >
                            {{ source }}
                        </n-tag>
                    </n-space>
                </div>
            </div>
        </Card>
    </div>
</template>

<style scoped>
.rag-page {
    max-width: 980px;
    margin: 0 auto;
}

.rag-header,
.question-card,
.answer-card,
.sources-card {
    margin-bottom: 16px;
}

.actions {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
}

.hint {
    color: #64748b;
    font-size: 13px;
}

.sources-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 12px;
}

.source-item {
    padding: 12px;
    border-radius: 10px;
    border: 1px solid rgba(47, 109, 181, 0.1);
    cursor: pointer;
    transition: border-color 0.2s ease;
}

.source-item:hover {
    border-color: rgba(47, 109, 181, 0.25);
}

.source-title {
    margin-bottom: 8px;
    color: #10233f;
    font-weight: 600;
}

@media (max-width: 720px) {
    .sources-grid {
        grid-template-columns: 1fr;
    }
}
</style>
