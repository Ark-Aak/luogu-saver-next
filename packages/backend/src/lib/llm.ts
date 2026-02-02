import OpenAI from 'openai';
import { config } from '@/config';
import { logger } from '@/lib/logger';

export type LLMScenario = 'chat' | 'summary' | 'embedding' | 'censor';

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
                max_tokens: scenarios.summary.maxTokens
            };
        } else if (scenario === 'embedding') {
            use = scenarios.embedding.use;
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
        scenario: 'chat' | 'summary' | 'censor' = 'chat'
    ): Promise<LLMResponse> {
        const { providerId, modelId, modelParams } = this.getContext(scenario);
        const client = this.getClient(providerId);

        logger.debug({ providerId, modelId, scenario }, 'Starting LLM chat');

        try {
            const response = await client.chat.completions.create({
                model: modelId!,
                messages,
                ...modelParams
            });

            return {
                content: response.choices[0]?.message?.content,
                usage: response.usage,
                raw: response
            };
        } catch (error) {
            logger.error({ error, providerId, modelId }, 'LLM chat failed');
            throw error;
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
            logger.error({ error, providerId, modelId }, 'LLM embedding failed');
            throw error;
        }
    }
}

export const llm = new LLMService();
