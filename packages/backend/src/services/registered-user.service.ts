import { RegisteredUser } from '@/entities/registered-user';
import { Not } from 'typeorm';

type CpOAuthRegisteredUserData = {
    cpOAuthSub: string;
    luoguUid: number;
    name?: string;
    avatarUrl?: string;
};

export class RegisteredUserService {
    private static isDuplicateKeyError(error: unknown): boolean {
        return (
            typeof error === 'object' &&
            error !== null &&
            'code' in error &&
            (error as { code?: string }).code === 'ER_DUP_ENTRY'
        );
    }

    static async upsertCpOAuthUser(data: CpOAuthRegisteredUserData): Promise<RegisteredUser> {
        if (!data.cpOAuthSub) throw new Error('CP OAuth sub is required');
        if (!Number.isInteger(data.luoguUid) || data.luoguUid <= 0) {
            throw new Error('Positive Luogu user ID is required');
        }

        const repository = RegisteredUser.getRepository();
        const duplicateLuoguUid = await repository.findOne({
            where: {
                luoguUid: data.luoguUid,
                cpOAuthSub: Not(data.cpOAuthSub)
            }
        });

        if (duplicateLuoguUid) {
            throw new Error('Luogu account is already bound to another CP OAuth account');
        }

        const registeredUser = repository.create({
            cpOAuthSub: data.cpOAuthSub,
            luoguUid: data.luoguUid,
            name: data.name || `User ${data.luoguUid}`,
            avatarUrl: data.avatarUrl || null
        });

        try {
            await repository.upsert(registeredUser, ['cpOAuthSub']);
        } catch (error) {
            if (this.isDuplicateKeyError(error)) {
                throw new Error('Luogu account is already bound to another CP OAuth account');
            }
            throw error;
        }

        const saved = await repository.findOneByOrFail({ cpOAuthSub: data.cpOAuthSub });
        return saved;
    }

    static async getById(id: number): Promise<RegisteredUser | null> {
        return RegisteredUser.findOne({ where: { id } });
    }
}
