import type { DataResponse, Paste as LuoguPaste } from '@/types/luogu-api';
import { fetch } from '@/utils/fetch';
import { C3vkMode } from '@/shared/c3vk';
import { redisClient } from '@/lib/redis';
import { config } from '@/config';
import { getRandomString } from '@/utils/string';
import { logger } from '@/lib/logger';

export class VerificationService {
    private static async prepareLuogu(uid: number) {
        const code = getRandomString(config.verification.luogu.codeLength);
        await redisClient.set(
            `verification:luogu:${uid}`,
            code,
            'EX',
            config.verification.luogu.codeExpireTime
        );
        logger.debug({ uid, code }, 'Generated Luogu verification code');
        return { code, expireAt: Date.now() + config.verification.luogu.codeExpireTime * 1000 };
    }

    private static async verifyLuogu(uid: number, code: string): Promise<boolean> {
        const storedCode = await redisClient.get(`verification:luogu:${uid}`);
        if (storedCode === code) {
            await redisClient.del(`verification:luogu:${uid}`);
            logger.debug({ uid }, 'Luogu verification successful');
            return true;
        }
        logger.debug({ uid }, 'Luogu verification failed: code mismatch');
        return false;
    }

    static async prepareForLuogu(uid: number) {
        return await this.prepareLuogu(uid);
    }

    static async verifyByLuogu(uid: number, pasteId: string) {
        const url = `https://www.luogu.com/paste/${pasteId}`;
        const resp: DataResponse<{ paste: LuoguPaste }> = await fetch(url, C3vkMode.MODERN);

        if (resp.currentData.paste.user.uid !== uid) {
            throw new Error('Verification failed: Paste does not belong to the user');
        }

        return await this.verifyLuogu(uid, resp.currentData.paste.data);
    }
}
