import { BaseEntity, Entity, PrimaryColumn, Column, CreateDateColumn } from 'typeorm';
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

    @Column({ type: 'varchar', nullable: true })
    target: string;

    @Column({ type: 'json' })
    payload: any;
}
