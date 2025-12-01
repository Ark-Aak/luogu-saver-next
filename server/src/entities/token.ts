import {
    Entity, BaseEntity, PrimaryColumn,
    Column, CreateDateColumn, Index
} from 'typeorm';

import { User } from './user';

@Entity({ name: 'token' })
export class Token extends BaseEntity {
    @PrimaryColumn({ type: 'varchar', length: 32 })
    id: string;

    @Column({ unsigned: true, unique: true })
    uid: number;

    @Column({ unsigned: true })
    role: number;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: number;

    static async validate(token: string): Promise<number | null> {
        const tokenRecord = await Token.findOne({ where: { id: token } });
        return tokenRecord ? tokenRecord.uid : null;
    }
}