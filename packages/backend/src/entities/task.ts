import { Entity, PrimaryColumn, Column, CreateDateColumn } from 'typeorm';
import { BaseEntity } from './base';
import { TaskStatus, TaskType } from '@/shared/task';

@Entity({ name: 'task' })
export class Task extends BaseEntity {
    @PrimaryColumn({ type: 'varchar', length: 32 })
    id: string;

    @Column({ type: 'text', nullable: true })
    info: string | null;

    @Column({ type: 'int', default: TaskStatus.PENDING })
    status: TaskStatus;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

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
