import {
    Entity, BaseEntity, PrimaryGeneratedColumn,
    Column, CreateDateColumn, UpdateDateColumn
} from 'typeorm';

import { UserColor } from '@/constants/user-color';
import { Cacheable } from '@/decorators/cacheable';

@Entity({ name: 'user' })
export class User extends BaseEntity {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ nullable: true })
    name?: string;

    @Column({ type: 'varchar', nullable: true })
    color?: UserColor;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: number;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: number;

    @Cacheable(3600 * 24 * 3, (id) => `user:${id}`, User)
    static async findById(id: number) {
        return await User.findOne({ where: { id } });
    }
}