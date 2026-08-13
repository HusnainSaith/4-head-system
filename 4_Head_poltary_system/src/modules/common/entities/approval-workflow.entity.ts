import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('approval_workflows')
@Index(['entityType', 'entityId'])
@Index(['status'])
export class ApprovalWorkflow {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  entityType: string; // EXPENSE, PURCHASE, ADJUSTMENT, etc.

  @Column()
  entityId: string;

  @Column()
  creatorUserId: string; // Who created the record

  @Column({ nullable: true })
  approverUserId: string; // Who is supposed to approve

  @Column({
    type: 'enum',
    enum: ['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'],
  })
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';

  @Column({ type: 'date', nullable: true })
  approvalDate: Date;

  @Column({ nullable: true })
  approvalNotes: string; // Approver's comments

  @Column({ nullable: true })
  rejectionReason: string;

  @Column({
    type: 'enum',
    enum: ['PENDING_APPROVAL', 'AUTO_APPROVED', 'FORCE_POSTED'],
  })
  approvalLevel: 'PENDING_APPROVAL' | 'AUTO_APPROVED' | 'FORCE_POSTED';

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
