import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    Index
} from 'typeorm';
import { BaseEntity } from './base';

export enum DiscoveryRunStatus {
    ACTIVE = 'active',
    COMPLETED = 'completed',
    STOPPED = 'stopped',
    FAILED = 'failed'
}

@Entity({ name: 'discovery_run' })
@Index('idx_discovery_run_status', ['status'])
export class DiscoveryRun extends BaseEntity {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'seed_url' })
    seedUrl: string;

    @Column({ default: DiscoveryRunStatus.ACTIVE })
    status: DiscoveryRunStatus;

    @Column({ name: 'max_pages', default: 50 })
    maxPages: number;

    @Column({ name: 'force_update', type: 'tinyint', default: 0 })
    forceUpdate: boolean;

    @Column({ name: 'visited_pages', default: 0 })
    visitedPages: number;

    @Column({ name: 'failed_pages', default: 0 })
    failedPages: number;

    @Column({ name: 'pending_pages', default: 0 })
    pendingPages: number;

    @Column({ name: 'discovered_articles', default: 0 })
    discoveredArticles: number;

    @Column({ name: 'created_workflows', default: 0 })
    createdWorkflows: number;

    @Column({ name: 'last_error', type: 'text', nullable: true })
    lastError: string | null;

    @Column({ name: 'finished_at', type: 'datetime', nullable: true })
    finishedAt: Date | null;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;
}
