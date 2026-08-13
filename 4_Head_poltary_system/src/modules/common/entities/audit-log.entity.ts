import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('audit_logs')
@Index(['entityType', 'entityId'])
@Index(['userId', 'actionType'])
@Index(['createdAt'])
export class AuditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string; // Who performed the action

  @Column()
  entityType: string; // PURCHASE, SALE, EXPENSE, JOURNAL_ENTRY, etc.

  @Column()
  entityId: string; // ID of the entity

  @Column({
    type: 'enum',
    enum: [
      'CREATE',
      'UPDATE',
      'DELETE',
      'POST',
      'REVERSE',
      'APPROVE',
      'REJECT',
      'VIEW',
    ],
  })
  actionType:
    | 'CREATE'
    | 'UPDATE'
    | 'DELETE'
    | 'POST'
    | 'REVERSE'
    | 'APPROVE'
    | 'REJECT'
    | 'VIEW';

  @Column({ type: 'text', nullable: true })
  oldValues: string; // JSON string of previous values

  @Column({ type: 'text', nullable: true })
  newValues: string; // JSON string of new values

  @Column({ nullable: true })
  description: string;

  @Column({ nullable: true })
  ipAddress: string;

  @Column({ nullable: true })
  sessionId: string;

  @Column({ nullable: true })
  userAgent: string;

  @Column({
    type: 'enum',
    enum: ['SUCCESS', 'FAILURE'],
  })
  status: 'SUCCESS' | 'FAILURE';

  @Column({ nullable: true })
  errorMessage: string; // If status is FAILURE

  @CreateDateColumn()
  createdAt: Date;
}
