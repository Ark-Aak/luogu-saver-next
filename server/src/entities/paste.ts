import {
    Entity, BaseEntity, PrimaryColumn,
    Column, CreateDateColumn, UpdateDateColumn, Index
} from 'typeorm';

import { Type } from 'class-transformer';
import { User } from './user';
import renderMarkdown from '@/utils/markdown';

@Entity({ name: 'paste' })
export class Paste extends BaseEntity {
    @PrimaryColumn({ length: 8 })
    id: string;

    @Column()
    title: string;

    @Column({ type: 'mediumtext', nullable: true })
    content?: string;

    @Column({ name: 'author_uid', unsigned: true })
    authorUid?: number;

    @Column({ type: 'tinyint', default: 0 })
    deleted: boolean;

    @CreateDateColumn({ name: 'created_at' })
    @Type(() => Date)
    createdAt: number;

    @UpdateDateColumn({ name: 'updated_at' })
    @Type(() => Date)
    updatedAt: number;

    @Column({ name: 'deleted_reason', default: '作者要求删除' })
    deletedReason: string;

    author?: User;
    renderedContent?: string;

    async loadRelationships() {
        this.author = this.authorUid ? (await User.findOne({ where: { id: this.authorUid } }))! : undefined;
        this.renderedContent = this.content ? await renderMarkdown(this.content) : undefined;
    }
}