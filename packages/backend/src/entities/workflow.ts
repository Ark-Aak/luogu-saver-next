import {
    Entity,
    BaseEntity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn
} from 'typeorm';

@Entity({ name: 'workflow' })
export class Workflow extends BaseEntity {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'root_job_id', nullable: true })
    rootJobId: string;

    @Column({ name: 'queue_name', nullable: true })
    queueName: string;

    @Column({ default: 'pending' })
    status: string;

    @Column({ type: 'json' })
    definition: any;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;
}
