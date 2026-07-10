import {
    Column,
    CreateDateColumn,
    Entity,
    Index,
    PrimaryGeneratedColumn,
    UpdateDateColumn
} from 'typeorm';
import { BaseEntity } from './base';

export type DeletionRequestTargetType = 'article' | 'paste';

export type DeletionRequestStatus = 'pending' | 'approved' | 'rejected';

@Entity({ name: 'deletion_request' })
@Index('idx_deletion_request_status_created_at', ['status', 'createdAt'])
@Index('idx_deletion_request_target', ['targetType', 'targetId'])
@Index('idx_deletion_request_requester_created_at', ['requesterId', 'createdAt'])
export class DeletionRequest extends BaseEntity {
    @PrimaryGeneratedColumn({ type: 'int', unsigned: true })
    id: number;

    @Column({ name: 'target_type', type: 'varchar', length: 16 })
    targetType: DeletionRequestTargetType;

    @Column({ name: 'target_id', type: 'varchar', length: 8 })
    targetId: string;

    @Column({ name: 'requester_id', type: 'int', unsigned: true })
    requesterId: number;

    @Column({ type: 'varchar', length: 500 })
    reason: string;

    @Column({ type: 'varchar', length: 16, default: 'pending' })
    status: DeletionRequestStatus;

    @Column({ name: 'resolution_comment', type: 'varchar', length: 500, nullable: true })
    resolutionComment: string | null;

    @Column({ name: 'handler_id', type: 'int', unsigned: true, nullable: true })
    handlerId: number | null;

    @Column({ name: 'handled_at', type: 'datetime', nullable: true })
    handledAt: Date | null;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;
}
