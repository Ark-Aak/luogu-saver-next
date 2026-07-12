import { createHash } from 'crypto';
import {
    DeepPartial,
    EntityManager,
    EntityTarget,
    FindOptionsSelect,
    FindOptionsWhere,
    ObjectLiteral,
    QueryDeepPartialEntity
} from 'typeorm';
import { isDuplicateKeyError } from '@/utils/db-errors';

type HashedContentEntity = ObjectLiteral & {
    id: string;
    content: string;
    contentHash?: string;
};

type SaveHashedContentOptions<TEntity extends HashedContentEntity> = {
    manager: EntityManager;
    entity: EntityTarget<TEntity>;
    id: string;
    content: string;
    forceUpdate?: boolean;
    incomingData: DeepPartial<TEntity>;
    defaults?: DeepPartial<TEntity>;
    isUnchanged?: (entity: TEntity, hash: string) => boolean;
    comparisonFields?: Array<keyof TEntity>;
};

export async function saveHashedContent<TEntity extends HashedContentEntity>(
    options: SaveHashedContentOptions<TEntity>
): Promise<{ skipped: boolean; entity: TEntity | null }> {
    const repository = options.manager.getRepository<TEntity>(options.entity);
    const hash = createHash('sha256').update(options.content).digest('hex');
    const select = { id: true, contentHash: true } as FindOptionsSelect<TEntity>;
    for (const field of options.comparisonFields || []) {
        (select as Record<keyof TEntity, boolean>)[field] = true;
    }

    const findExisting = (lock: boolean) =>
        repository.findOne({
            where: { id: options.id } as FindOptionsWhere<TEntity>,
            select,
            ...(lock ? { lock: { mode: 'pessimistic_write' as const } } : {})
        });

    const incomingData = {
        ...options.incomingData,
        id: options.id,
        content: options.content,
        contentHash: hash
    } as DeepPartial<TEntity>;

    let entity = await findExisting(false);
    if (!entity) {
        const insertData = {
            ...options.defaults,
            ...incomingData
        } as QueryDeepPartialEntity<TEntity>;
        try {
            await repository.insert(insertData);
            return {
                skipped: false,
                entity: repository.create(insertData as DeepPartial<TEntity>)
            };
        } catch (error) {
            if (!isDuplicateKeyError(error)) throw error;
        }
    }

    entity = await findExisting(true);
    if (!entity) throw new Error(`Concurrent row for ${options.id} disappeared before update`);

    const isUnchanged = options.isUnchanged || ((item: TEntity) => item.contentHash === hash);
    if (!options.forceUpdate && entity && isUnchanged(entity, hash)) {
        return { skipped: true, entity };
    }

    await repository.update(
        { id: options.id } as FindOptionsWhere<TEntity>,
        incomingData as QueryDeepPartialEntity<TEntity>
    );
    return { skipped: false, entity: repository.create({ ...entity, ...incomingData }) };
}
