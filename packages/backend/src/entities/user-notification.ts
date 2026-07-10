import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';
import { BaseEntity } from './base';

@Entity({ name: 'user_notification' })
@Index('idx_user_notification_recipient_created_at', ['recipientId', 'createdAt'])
@Index('idx_user_notification_recipient_read_at', ['recipientId', 'readAt'])
export class UserNotification extends BaseEntity {
    @PrimaryGeneratedColumn({ type: 'int', unsigned: true })
    id: number;

    @Column({ name: 'recipient_id', type: 'int', unsigned: true })
    recipientId: number;

    @Column({ type: 'varchar', length: 32 })
    type: string;

    @Column({ type: 'varchar', length: 255 })
    title: string;

    @Column({ type: 'text', nullable: true })
    content: string | null;

    @Column({ type: 'json', nullable: true })
    metadata: Record<string, unknown> | null;

    @Column({ name: 'read_at', type: 'datetime', nullable: true })
    readAt: Date | null;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;
}
