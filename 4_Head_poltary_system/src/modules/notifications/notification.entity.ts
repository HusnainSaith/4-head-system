import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Index,
  JoinColumn,
  ManyToOne,
} from 'typeorm';
import { AuditBaseEntity } from '../../common/entities/audit-base.entity';
import { User } from '../users/entities/user.entity';

@Entity('notifications')
@Index(['recipientUserId', 'status'])
@Index(['sourceType', 'sourceId'])
export class Notification extends AuditBaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 50 })
  type: string;

  @Column({ length: 255 })
  title: string;

  @Column({ type: 'text' })
  message: string;

  @Column({ name: 'recipient_email', length: 255, nullable: true })
  recipientEmail?: string;

  @Column({ name: 'recipient_user_id', type: 'uuid', nullable: true })
  recipientUserId?: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'recipient_user_id' })
  recipientUser?: User;

  @Column({ name: 'source_type', length: 50 })
  sourceType: string;

  @Column({ name: 'source_id', type: 'uuid' })
  sourceId: string;

  @Column({
    type: 'enum',
    enum: ['pending', 'sent', 'failed'],
    default: 'pending',
  })
  status: 'pending' | 'sent' | 'failed';

  @Column({ name: 'error_message', type: 'text', nullable: true })
  errorMessage?: string;

  @Column({ name: 'sent_at', type: 'timestamptz', nullable: true })
  sentAt?: Date | null;

  @Column({ type: 'jsonb', nullable: true })
  context?: Record<string, unknown>;
}
