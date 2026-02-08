import { BaseEntity as TypeOrmBaseEntity, EntityManager } from 'typeorm';

export class BaseEntity extends TypeOrmBaseEntity {
    static async transaction<T>(
        runInTransaction: (entityManager: EntityManager) => Promise<T>
    ): Promise<T> {
        return this.getRepository().manager.transaction(runInTransaction);
    }
}
