import { z } from 'zod';

export const VerificationSchema = z.object({
    luogu: z.object({
        codeExpireTime: z
            .number()
            .int()
            .positive()
            .default(5 * 60),
        codeLength: z.number().int().positive().default(32)
    })
});
