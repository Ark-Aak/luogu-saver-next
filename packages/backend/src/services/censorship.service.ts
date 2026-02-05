import { Censorship } from '@/entities/censorship';
import { CensorTarget } from '@/shared/task';

export class CensorshipService {
    static async createCensorship(data: Partial<Censorship>): Promise<Censorship> {
        const censorship = new Censorship();
        Object.assign(censorship, data);
        return censorship;
    }

    static async saveCensorship(censorship: Censorship) {
        return await censorship.save();
    }

    static async getCensorshipsByTypeAndId(
        type: CensorTarget,
        targetId: string
    ): Promise<Censorship[] | null> {
        return await Censorship.find({ where: { type, targetId }, order: { createdAt: 'DESC' } });
    }
}
