import {
    Entity, BaseEntity, PrimaryColumn,
    Column, CreateDateColumn
} from 'typeorm';

import { Type } from 'class-transformer';

@Entity({ name: 'token' })
export class Token extends BaseEntity {
    @PrimaryColumn({ type: 'varchar', length: 32 })
    id: string;

    @Column({ unsigned: true, unique: true })
    uid: number;

    @Column({ unsigned: true })
    role: number;

    @CreateDateColumn({ name: 'created_at' })
    @Type(() => Date)
    createdAt: Date;

    static async validate(token: string): Promise<number | null> {
        const tokenRecord = await Token.findOne({ where: { id: token } });
        return tokenRecord ? tokenRecord.uid : null;
    }
}