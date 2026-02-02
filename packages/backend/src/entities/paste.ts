import {
    Entity,
    BaseEntity,
    PrimaryColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    ManyToOne,
    JoinColumn,
    Index
} from 'typeorm';

import { Type } from 'class-transformer';
import { User } from './user';
import renderMarkdown from '@/lib/markdown';

@Entity({ name: 'paste' })
@Index('idx_author_id', ['authorId'])
export class Paste extends BaseEntity {
    @PrimaryColumn({ length: 8 })
    id: string;

    @Column({ type: 'mediumtext' })
    content: string;

    @Column({ name: 'author_id', unsigned: true })
    authorId: number;

    @Column({ type: 'tinyint', default: 0 })
    deleted: boolean;

    @CreateDateColumn({ name: 'created_at' })
    @Type(() => Date)
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    @Type(() => Date)
    updatedAt: Date;

    @Column({ name: 'delete_reason', default: '管理员删除' })
    deleteReason: string;

    @Column({ type: 'varchar', name: 'content_hash', nullable: true })
    contentHash?: string;

    @ManyToOne(() => User)
    @JoinColumn({ name: 'author_id' })
    author?: User;

    renderedContent?: string;

    async renderContent() {
        this.renderedContent = this.content ? await renderMarkdown(this.content) : undefined;
    }
}
