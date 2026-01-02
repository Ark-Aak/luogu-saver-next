import { Cacheable } from '@/decorators/cacheable';
import { Paste } from '@/entities/paste';
import { CacheEvict } from '@/decorators/cache-evict';

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
}
