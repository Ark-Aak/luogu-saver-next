import { Cacheable } from '@/decorators/cacheable';
import { Paste } from '@/entities/paste';

export class PasteService {
    @Cacheable(120, (id) => `paste:${id}`, Paste)
    static async getPasteById(id: string): Promise<Paste | null> {
        return await Paste.findOne({ where: { id, deleted: false } });
    }

    @Cacheable(600, () => 'paste:count')
    static async getPasteCount(): Promise<number> {
        return await Paste.count({ where: { deleted: false } });
    }
}