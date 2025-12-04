import { Entity, PrimaryColumn, Column, Index, CreateDateColumn } from "typeorm";

import { Type } from "class-transformer";

@Index("idx_expire_time", ["expireTime"])

@Entity({ name: 'task' })
export class Task {
    @PrimaryColumn({ type: 'varchar', length: 8 })
    id: string;

    @Column({ type: 'text' })
    info: string;

    @Column({ default: 0 })
    status: number;

    @CreateDateColumn({ name: 'created_at' })
    @Type(() => Date)
    createdAt: Date;

    @Column({ name: "expire_time" })
    @Type(() => Date)
    expireTime: Date;

    @Column({ default: 0 })
    type: number;

    @Column({ name: "oid" })
    originId: string;
}