import { Entity, BaseEntity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

import { UserColor } from '@/shared/user';
import { Cacheable } from '@/decorators/cacheable';

@Entity({ name: 'user' })
export class User extends BaseEntity {
    @PrimaryColumn({ type: 'int', unsigned: true })
    id: number;

    @Column()
    name: string;

    @Column({ type: 'varchar' })
    color: UserColor;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: number;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: number;

    @Cacheable(3600 * 24 * 3, id => `user:${id}`, User)
    static async findById(id: number) {
        return await User.findOne({ where: { id } });
    }
}
