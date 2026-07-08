import OpenAI from 'openai';
import { config } from '@/config';
import { logger } from '@/lib/logger';
import { normalizeErrorReason } from '@/utils/error-reason';

export type LLMScenario = 'chat' | 'summary' | 'answer' | 'embedding' | 'rerank' | 'censor';

export interface LLMResponse {
    content?: string | null;
    usage?: OpenAI.Completions.CompletionUsage;
    raw: OpenAI.Chat.Completions.ChatCompletion;
}

export interface EmbeddingResponse {
    embedding: number[];
    usage?: OpenAI.Embeddings.CreateEmbeddingResponse.Usage;
    raw: OpenAI.Embeddings.CreateEmbeddingResponse;
}

export interface RerankResult {
    index: number;
    relevanceScore: number;
}

export interface RerankResponse {
    results: RerankResult[];
    raw: any;
}

export type LLMChatOptions = {
    tools?: OpenAI.Chat.Completions.ChatCompletionTool[];
    toolChoice?: OpenAI.Chat.Completions.ChatCompletionToolChoiceOption;
};

class LLMService {
    private clients: Map<string, OpenAI> = new Map();

    private getClient(providerId: string): OpenAI {
        if (this.clients.has(providerId)) {
            return this.clients.get(providerId)!;
        }

        const provider = config.llm.providers.find(p => p.id === providerId);
        if (!provider) {
            throw new Error(`LLM Provider with ID ${providerId} not found`);
        }

        const client = new OpenAI({
            baseURL: provider.apiUrl,
            apiKey: provider.token
        });

        this.clients.set(providerId, client);
        return client;
    }

    private getContext(scenario: LLMScenario) {
        const scenarios = config.llm.scenarios;
        let use: string;
        let modelParams: any = {};

        if (scenario === 'chat') {
            use = scenarios.chat.use;
            modelParams = {
                temperature: scenarios.chat.temperature,
                max_tokens: scenarios.chat.maxTokens,
                top_p: scenarios.chat.topP,
                frequency_penalty: scenarios.chat.frequencyPenalty,
                presence_penalty: scenarios.chat.presencePenalty,
                stop:
                    scenarios.chat.stopSequences.length > 0
                        ? scenarios.chat.stopSequences
                        : undefined
            };
        } else if (scenario === 'summary') {
            use = scenarios.summary.use;
            modelParams = {
                temperature: scenarios.summary.temperature,
                max_tokens: scenarios.summary.maxTokens,
                top_p: scenarios.summary.topP
            };
        } else if (scenario === 'answer') {
            use = scenarios.answer?.use || scenarios.chat.use;
            modelParams = {
                temperature: scenarios.answer.temperature,
                max_tokens: scenarios.answer.maxTokens,
                top_p: scenarios.answer.topP
            };
        } else if (scenario === 'embedding') {
            use = scenarios.embedding.use;
        } else if (scenario === 'rerank') {
            use = scenarios.rerank?.use || '';
        } else if (scenario === 'censor') {
            use = scenarios.censor.use;
        } else {
            throw new Error(`Unknown scenario: ${scenario}`);
        }

        if (!use) {
            throw new Error(`No provider configured for scenario: ${scenario}`);
        }

        let providerId = use;
        let modelId: string | undefined;

        if (use.includes(':')) {
            const parts = use.split(':');
            providerId = parts[0];
            modelId = parts.slice(1).join(':');
        }

        const provider = config.llm.providers.find(p => p.id === providerId);
        if (!provider) {
            throw new Error(`LLM Provider with ID ${providerId} not found. Configured use: ${use}`);
        }

        if (!modelId) {
            if (provider.models.length > 0) {
                modelId = provider.models[0].id;
            } else {
                throw new Error(`LLM Provider ${providerId} has no models configured`);
            }
        }

        return {
            providerId,
            modelId,
            modelParams
        };
    }

    public async chat(
        messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[],
        scenario: 'chat' | 'summary' | 'answer' | 'censor' = 'chat',
        options: LLMChatOptions = {}
    ): Promise<LLMResponse> {
        const { providerId, modelId, modelParams } = this.getContext(scenario);
        const client = this.getClient(providerId);

        logger.debug(
            { providerId, modelId, scenario, toolCount: options.tools?.length || 0 },
            'Starting LLM chat'
        );

        try {
            const response = await client.chat.completions.create({
                model: modelId!,
                messages,
                ...(options.tools
                    ? {
                          tools: options.tools,
                          tool_choice: options.toolChoice || 'auto'
                      }
                    : {}),
                ...modelParams
            });

            return {
                content: response.choices[0]?.message?.content,
                usage: response.usage,
                raw: response
            };
        } catch (error) {
            const reason = normalizeErrorReason(error);
            logger.error({ reason, providerId, modelId, scenario }, 'LLM chat failed');
            throw new Error(reason);
        }
    }

    public async embedding(input: string): Promise<EmbeddingResponse> {
        const { providerId, modelId } = this.getContext('embedding');
        const client = this.getClient(providerId);

        logger.debug({ providerId, modelId }, 'Starting LLM embedding');

        try {
            const response = await client.embeddings.create({
                model: modelId!,
                input
            });

            return {
                embedding: response.data[0].embedding,
                usage: response.usage,
                raw: response
            };
        } catch (error) {
            const reason = normalizeErrorReason(error);
            logger.error({ reason, providerId, modelId }, 'LLM embedding failed');
            throw new Error(reason);
        }
    }

    public hasRerank(): boolean {
        return Boolean(config.llm.scenarios.rerank?.use);
    }

    public async rerank(
        query: string,
        documents: string[],
        topN: number = documents.length
    ): Promise<RerankResponse> {
        const { providerId, modelId } = this.getContext('rerank');
        const client = this.getClient(providerId);

        logger.debug({ providerId, modelId, documents: documents.length }, 'Starting LLM rerank');

        try {
            const payload = await client.post<any>('/rerank', {
                body: {
                    model: modelId!,
                    query,
                    documents,
                    top_n: topN,
                    return_documents: false,
                    temperature: config.llm.scenarios.rerank.temperature,
                    top_p: config.llm.scenarios.rerank.topP
                }
            });
            return {
                results: this.normalizeRerankResults(payload?.results),
                raw: payload
            };
        } catch (error) {
            const reason = normalizeErrorReason(error);
            logger.error({ reason, providerId, modelId }, 'LLM rerank failed');
            throw new Error(reason);
        }
    }

    private normalizeRerankResults(results: any): RerankResult[] {
        if (!Array.isArray(results)) return [];
        return results
            .map(item => ({
                index: Number(item?.index),
                relevanceScore: Number(item?.relevance_score ?? item?.relevanceScore ?? 0)
            }))
            .filter(item => Number.isInteger(item.index) && Number.isFinite(item.relevanceScore));
    }
}

export const llm = new LLMService();
