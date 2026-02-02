import { z } from 'zod';

export const LLMModelSchema = z.object({
    id: z.string(),
    name: z.string()
});

export const LLMProviderSchema = z.object({
    id: z.string(),
    apiUrl: z.string(),
    token: z.string(),
    models: z.array(LLMModelSchema).default([])
});

export const LLMConfigSchema = z.object({
    providers: z.array(LLMProviderSchema).default([]),
    scenarios: z.object({
        chat: z.object({
            use: z.string(),
            temperature: z.number().min(0).max(1).default(0.7),
            maxTokens: z.number().min(1).default(2048),
            topP: z.number().min(0).max(1).default(1),
            frequencyPenalty: z.number().min(-2).max(2).default(0),
            presencePenalty: z.number().min(-2).max(2).default(0),
            stopSequences: z.array(z.string()).default([])
        }),
        summary: z.object({
            use: z.string(),
            temperature: z.number().min(0).max(1).default(0.7),
            maxTokens: z.number().min(1).default(1024)
        }),
        embedding: z.object({
            use: z.string()
        }),
        censor: z.object({
            use: z.string()
        })
    })
});

export type LLMConfig = z.infer<typeof LLMConfigSchema>;
