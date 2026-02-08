import { Cacheable } from '@/decorators/cacheable';
import { Paste } from '@/entities/paste';
import { CacheEvict } from '@/decorators/cache-evict';
import { createHash } from 'crypto'; // Imported

export class PasteService {
    @Cacheable(600, id => `paste:${id}`, Paste)
    static async getPasteById(id: string): Promise<Paste | null> {
        return await Paste.findOne({ where: { id }, relations: ['author'] });
    }

    @Cacheable(600, () => 'paste:count')
    static async getPasteCount(): Promise<number> {
        return await Paste.count({ where: { deleted: false } });
    }

    static async getPasteByIdWithoutCache(id: string): Promise<Paste | null> {
        return await Paste.findOne({ where: { id }, relations: ['author'] });
    }

    @CacheEvict((paste: Paste) => [`paste:${paste.id}`, `paste:count`])
    static async savePaste(paste: Paste): Promise<Paste> {
        return await paste.save();
    }

    static async saveLuoguPaste(
        data: any,
        forceUpdate: boolean = false
    ): Promise<{ skipped: boolean; content: string }> {
        let result = { skipped: false, content: '' };

        await Paste.transaction(async manager => {
            const hash = createHash('sha256').update(data.data).digest('hex');
            let paste = await manager.findOne(Paste, {
                where: { id: data.id },
                lock: { mode: 'pessimistic_write' }
            });

            if (!forceUpdate && paste && paste.contentHash === hash) {
                result = { skipped: true, content: '' };
                return;
            }

            const incomingData: Partial<Paste> = {
                content: data.data,
                contentHash: hash,
                authorId: data.user.uid
            };
            if (paste) {
                Object.assign(paste, incomingData);
            } else {
                paste = new Paste();
                paste.id = data.id;
                paste.deleted = false;
                Object.assign(paste, incomingData);
            }
            await manager.save(paste);
            result = { skipped: false, content: paste.content };
        });

        return result;
    }
}
