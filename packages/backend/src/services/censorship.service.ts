import { Censorship } from '@/entities/censorship';
import { CensorTarget } from '@/shared/task';

export class CensorshipService {
    static async createCensorship(
        type: CensorTarget,
        targetId: string,
        rating: number,
        category: string,
        reason: string,
        userDisplayMessage: string
    ): Promise<Censorship> {
        const censorship = new Censorship();
        censorship.type = type;
        censorship.targetId = targetId;
        censorship.rating = rating;
        censorship.reason = reason;
        censorship.category = category;
        censorship.userDisplayMessage = userDisplayMessage;
        return censorship;
    }

    static async saveCensorship(censorship: Censorship) {
        return await censorship.save();
    }

    static async getCensorshipByTypeAndId(
        type: CensorTarget,
        targetId: string
    ): Promise<Censorship | null> {
        return await Censorship.findOne({ where: { type, targetId } });
    }
}
