import {
    Entity,
    BaseEntity,
    PrimaryColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    Index,
    ManyToOne,
    JoinColumn
} from 'typeorm';

import { Type } from 'class-transformer';
import { User } from './user';
import { ArticleCategory } from '@/shared/article';
import renderMarkdown from '@/lib/markdown';

@Entity({ name: 'article' })
@Index('idx_articles_author', ['authorId'])
@Index('idx_articles_deleted_priority_updated_at', ['deleted', 'priority', 'updatedAt'])
@Index('idx_articles_deleted_view_count', ['deleted', 'viewCount'])
@Index('idx_created_at', ['createdAt'])
@Index('idx_priority', ['priority'])
@Index('idx_updated_at', ['updatedAt'])
export class Article extends BaseEntity {
    @PrimaryColumn({ type: 'varchar', length: 8 })
    id: string;

    @Column()
    title: string;

    @Column({ type: 'mediumtext' })
    content: string;

    @Column({ name: 'author_id', unsigned: true })
    authorId: number;

    @Column({ type: 'int' })
    category: ArticleCategory;

    @Column({ default: 0 })
    upvote: number;

    @Column({ name: 'favor_count', default: 0 })
    favorCount: number;

    @Column({ name: 'solution_for_pid', length: 50, nullable: true })
    solutionForPid?: string;

    @Column({ default: 0 })
    priority: number;

    @Column({ type: 'tinyint', default: 0 })
    deleted: boolean;

    @Column({ type: 'json' })
    tags: string[];

    @CreateDateColumn({ name: 'created_at' })
    @Type(() => Date)
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    @Type(() => Date)
    updatedAt: Date;

    @Column({ name: 'delete_reason', nullable: true })
    deleteReason?: string;

    @Column({ type: 'varchar', name: 'content_hash', nullable: true })
    contentHash?: string;

    @Column({ name: 'view_count', default: 0 })
    viewCount: number;

    @Column({ type: 'text', nullable: true })
    summary?: string;

    @ManyToOne(() => User)
    @JoinColumn({ name: 'author_id' })
    author?: User;

    renderedContent?: string;

    async renderContent() {
        this.renderedContent = this.content ? await renderMarkdown(this.content) : undefined;
    }
}
