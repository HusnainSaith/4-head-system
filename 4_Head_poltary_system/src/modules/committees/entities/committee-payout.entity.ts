import {
  Check,
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { AuditBaseEntity } from '../../../common/entities/audit-base.entity';
import { Committee } from './committee.entity';

@Entity('committee_payouts')
@Check('chk_committee_payout_amount_positive', 'payout_amount > 0')
@Check('chk_committee_payout_excess_nonnegative', 'excess_amount >= 0')
export class CommitteePayout extends AuditBaseEntity {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ name: 'committee_id', type: 'uuid', unique: true })
  committeeId: string;
  @ManyToOne(() => Committee, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'committee_id' })
  committee: Committee;
  @Column({ name: 'payout_amount', type: 'decimal', precision: 14, scale: 2 })
  payoutAmount: string;
  @Column({
    name: 'total_contributed',
    type: 'decimal',
    precision: 14,
    scale: 2,
  })
  totalContributed: string;
  @Column({
    name: 'excess_amount',
    type: 'decimal',
    precision: 14,
    scale: 2,
    insert: false,
    update: false,
  })
  excessAmount: string;
  @Column({ name: 'payout_date', type: 'date' }) payoutDate: string;
}
