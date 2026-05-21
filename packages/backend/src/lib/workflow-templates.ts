import { TaskDefinition, WorkflowDefinition } from '@/utils/flow-validator';
import { Permission } from '@/shared/permission';

export type WorkflowTemplateBuilder = (params: any) => WorkflowDefinition;

const normalizeReindexBatchSize = (value: any) => {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return 100;
    return Math.min(500, Math.max(1, Math.floor(parsed)));
};

const normalizeSummaryRebuildBatchSize = (value: any) => {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return 20;
    return Math.min(100, Math.max(1, Math.floor(parsed)));
};

export const WORKFLOW_TEMPLATES_PERMISSION: { [key: string]: Permission | null } = {
    'article-save-pipeline': null,
    'article-censor-pipeline': Permission.CREATE_WORKFLOW,
    'search-reindex-pipeline': Permission.MANAGE_SEARCH,
    'article-summary-rebuild-pipeline': Permission.MANAGE_SEARCH,
    'rag-search-pipeline': Permission.CREATE_WORKFLOW
};

export const WORKFLOW_TEMPLATES: Record<string, WorkflowTemplateBuilder> = {
    'article-save-pipeline': (params: any) => {
        const { targetId } = params;
        if (!targetId) {
            throw new Error('targetId is required for article-save-pipeline');
        }

        const tasks: TaskDefinition[] = [
            {
                name: 'save',
                track: true,
                report: true,
                data: {
                    type: 'save',
                    payload: {
                        target: 'article',
                        targetId: targetId,
                        metadata: {}
                    }
                }
            },
            {
                name: 'summary',
                fathers: ['save'],
                track: true,
                data: {
                    type: 'llm',
                    payload: {
                        target: 'summary',
                        metadata: {}
                    }
                }
            },
            {
                name: 'censor',
                fathers: ['save'],
                track: true,
                data: {
                    type: 'llm',
                    payload: {
                        target: 'censor',
                        metadata: {}
                    }
                }
            },
            {
                name: 'embedding',
                fathers: ['summary'],
                data: {
                    type: 'llm',
                    payload: {
                        target: 'embedding',
                        metadata: {}
                    }
                }
            },
            {
                name: 'update-embedding',
                fathers: ['embedding'],
                data: {
                    type: 'update',
                    payload: {
                        target: 'article_embedding',
                        targetId: targetId,
                        metadata: {}
                    }
                }
            },
            {
                name: 'update-summary',
                fathers: ['summary'],
                data: {
                    type: 'update',
                    payload: {
                        target: 'article_summary',
                        targetId: targetId,
                        metadata: {}
                    }
                }
            },
            {
                name: 'update-censor',
                fathers: ['censor'],
                data: {
                    type: 'update',
                    payload: {
                        target: 'censor',
                        targetId: targetId,
                        metadata: {
                            censorTarget: 'article'
                        }
                    }
                }
            },
            {
                name: 'update-search-index',
                fathers: ['update-summary'],
                track: true,
                report: true,
                data: {
                    type: 'update',
                    payload: {
                        target: 'search_index',
                        targetId: targetId,
                        metadata: {}
                    }
                }
            }
        ];

        return { tasks };
    },
    'article-censor-pipeline': (params: any) => {
        const { targetId } = params;
        if (!targetId) {
            throw new Error('targetId is required for article-censor-pipeline');
        }

        const tasks: TaskDefinition[] = [
            {
                name: 'censor',
                fathers: ['read-article'],
                track: true,
                report: true,
                data: {
                    type: 'llm',
                    payload: {
                        target: 'censor',
                        metadata: {}
                    }
                }
            },
            {
                name: 'read-article',
                track: true,
                data: {
                    type: 'read',
                    payload: {
                        target: 'article',
                        targetId: targetId,
                        metadata: {}
                    }
                }
            },
            {
                name: 'update-censor',
                fathers: ['censor'],
                data: {
                    type: 'update',
                    payload: {
                        target: 'censor',
                        targetId: targetId,
                        metadata: {
                            censorTarget: 'article'
                        }
                    }
                }
            }
        ];

        return { tasks };
    },
    'rag-search-pipeline': (params: any) => {
        const query = String(params?.query || '').trim();
        if (!query) throw new Error('query is required for rag-search-pipeline');

        const limit = Math.min(20, Math.max(1, Number(params?.limit) || 10));
        const maxArticles = Math.min(10, Math.max(1, Number(params?.maxArticles) || 6));
        const maxChars = Math.min(20000, Math.max(1000, Number(params?.maxChars) || 8000));

        const tasks: TaskDefinition[] = [
            {
                name: 'read-query',
                data: {
                    type: 'read',
                    payload: {
                        target: 'text',
                        metadata: { text: query }
                    }
                }
            },
            {
                name: 'keyword-search',
                fathers: ['read-query'],
                data: {
                    type: 'search',
                    payload: {
                        target: 'article',
                        metadata: { limit }
                    }
                }
            },
            {
                name: 'query-embedding',
                fathers: ['read-query'],
                data: {
                    type: 'llm',
                    payload: {
                        target: 'embedding',
                        metadata: {}
                    }
                }
            },
            {
                name: 'vector-search',
                fathers: ['query-embedding'],
                data: {
                    type: 'search',
                    payload: {
                        target: 'vector',
                        metadata: { limit }
                    }
                }
            },
            {
                name: 'build-context',
                fathers: ['read-query', 'keyword-search', 'vector-search'],
                data: {
                    type: 'rag',
                    payload: {
                        target: 'context',
                        metadata: { maxArticles, maxChars }
                    }
                }
            },
            {
                name: 'answer',
                fathers: ['build-context'],
                track: true,
                report: true,
                data: {
                    type: 'rag',
                    payload: {
                        target: 'answer',
                        metadata: {}
                    }
                }
            }
        ];

        return { tasks };
    },
    'article-summary-rebuild-pipeline': (params: any) => {
        const batchSize = normalizeSummaryRebuildBatchSize(params?.batchSize);
        const tasks: TaskDefinition[] = [
            {
                name: 'rebuild-summary',
                track: true,
                report: true,
                data: {
                    type: 'update',
                    payload: {
                        target: 'article_summary_rebuild',
                        targetId: 'articles',
                        metadata: { batchSize }
                    }
                }
            }
        ];

        return { tasks };
    },
    'search-reindex-pipeline': (params: any) => {
        const batchSize = normalizeReindexBatchSize(params?.batchSize);
        const tasks: TaskDefinition[] = [
            {
                name: 'reindex-search',
                track: true,
                report: true,
                data: {
                    type: 'update',
                    payload: {
                        target: 'search_reindex',
                        targetId: 'articles',
                        metadata: { batchSize }
                    }
                }
            }
        ];

        return { tasks };
    }
};
