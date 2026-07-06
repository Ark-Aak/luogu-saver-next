import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn
} from 'typeorm';
import { BaseEntity } from './base';

@Entity({ name: 'workflow' })
export class Workflow extends BaseEntity {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'root_job_id', type: 'varchar', nullable: true })
    rootJobId: string | null;

    @Column({ name: 'queue_name', type: 'varchar', nullable: true })
    queueName: string | null;

    @Column({ default: 'pending' })
    status: string;

    @Column({ type: 'json', nullable: true })
    result: any;

    @Column({ type: 'json' })
    definition: any;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;
}
