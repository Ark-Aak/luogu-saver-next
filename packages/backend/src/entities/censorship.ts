import {
    Entity,
    BaseEntity,
    Column,
    Index,
    PrimaryGeneratedColumn,
    CreateDateColumn
} from 'typeorm';

import { Type } from 'class-transformer';
import { CensorTarget } from '@/shared/task';

@Entity({ name: 'censorship' })
@Index('idx_censor_results_type_target_id', ['type', 'targetId'])
@Index('idx_censor_results_type_target_id_updated_at', ['type', 'targetId', 'updatedAt'])
@Index('idx_censor_results_updated_at', ['updatedAt'])
@Index('idx_censor_results_rating', ['rating'])
export class Censorship extends BaseEntity {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ type: 'varchar' })
    type: CensorTarget;

    @CreateDateColumn({ name: 'created_at' })
    @Type(() => Date)
    updatedAt: Date;

    @Column({ type: 'int' })
    rating: number;

    @Column({ type: 'varchar', length: 50 })
    category: string;

    @Column({ type: 'text' })
    reason: string;

    @Column({ type: 'text', name: 'user_display_message' })
    userDisplayMessage: string;

    @Column({ name: 'target_id', type: 'varchar', length: 8 })
    targetId: string;
}
