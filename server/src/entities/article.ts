import {
    Entity, BaseEntity, PrimaryColumn,
    Column, CreateDateColumn, UpdateDateColumn, Index,
    ManyToOne, JoinColumn
} from 'typeorm';

import { Type } from 'class-transformer';
import { User } from './user';
import { ArticleCategory } from '@/constants/article-category';
import renderMarkdown from '@/utils/markdown';

@Entity({ name: 'article' })
@Index('idx_articles_author', ['authorUid'])
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

    @Column({ type: 'mediumtext', nullable: true })
    content?: string;

    @Column({ name: 'author_uid', unsigned: true })
    authorUid?: number;

    @Column({ type: 'int', nullable: true })
    category?: ArticleCategory;

    @Column({ nullable: true })
    upvote?: number;

    @Column({ name: 'favor_count', nullable: true })
    favorCount?: number;

    @Column({ name: 'solution_for_pid', length: 50, nullable: true })
    solutionForPid?: string;

    @Column({ default: 0 })
    priority: number;

    @Column({ type: 'tinyint', default: 0 })
    deleted: boolean;

    @Column({ type: 'longtext', nullable: true })
    tags?: string;
    // TODO: change this column's type to varchar
    // Oh my dear. Why did I use longtext here?

    @CreateDateColumn({ name: 'created_at' })
    @Type(() => Date)
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    @Type(() => Date)
    updatedAt: Date;

    @Column({ name: 'deleted_reason', default: '作者要求删除' })
    deletedReason: string;

    @Column({ type: 'text', name: 'content_hash', nullable: true })
    contentHash?: string;
    // TODO: change this column's type to varchar

    @Column({ name: 'view_count', default: 0 })
    viewCount: number;

    @ManyToOne(() => User)
    @JoinColumn({ name: "author_uid" })
    author?: User;

    renderedContent?: string;

    async loadRelationships(loadUser = true, renderContent = true) {
        if (loadUser) this.author = this.authorUid ? (await User.findById(this.authorUid))! : undefined;
        if (renderContent) this.renderedContent = this.content ? await renderMarkdown(this.content) : undefined;
    }
}