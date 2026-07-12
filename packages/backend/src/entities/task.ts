import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';
import { BaseEntity } from './base';
import { TaskStatus, TaskType } from '@/shared/task';

@Entity({ name: 'task' })
@Index('idx_task_workflow_status_updated_at', ['workflowId', 'status', 'updatedAt'])
export class Task extends BaseEntity {
    @PrimaryColumn({ type: 'varchar', length: 32 })
    id: string;

    @Column({ type: 'text', nullable: true })
    info: string | null;

    @Column({ type: 'int', default: TaskStatus.PENDING })
    status: TaskStatus;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;

    @Column({ type: 'varchar' })
    type: TaskType;

    @Column({ type: 'json' })
    payload: any;

    @Column({ name: 'workflow_id', type: 'varchar', length: 36, nullable: true })
    workflowId: string | null;

    @Column({ name: 'task_name', type: 'varchar', nullable: true })
    taskName: string | null;

    @Column({ type: 'int', nullable: true })
    priority: number | null;

    @Column({ type: 'json', nullable: true })
    result: any;
}
