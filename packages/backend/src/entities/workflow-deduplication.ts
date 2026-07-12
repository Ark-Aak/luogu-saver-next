import {
    Column,
    CreateDateColumn,
    Entity,
    Index,
    JoinColumn,
    ManyToOne,
    PrimaryColumn,
    UpdateDateColumn
} from 'typeorm';
import { BaseEntity } from './base';
import { Workflow } from './workflow';

@Entity({ name: 'workflow_deduplication' })
@Index('idx_workflow_deduplication_workflow_id', ['workflowId'], { unique: true })
export class WorkflowDeduplication extends BaseEntity {
    @PrimaryColumn({ type: 'varchar', length: 191 })
    key: string;

    @Column({ name: 'workflow_id', type: 'varchar', length: 36 })
    workflowId: string;

    @ManyToOne(() => Workflow, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'workflow_id' })
    workflow?: Workflow;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;
}
