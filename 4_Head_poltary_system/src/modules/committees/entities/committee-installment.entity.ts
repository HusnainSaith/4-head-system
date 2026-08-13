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

@Entity('committee_installments')
@Check('chk_committee_installment_amount_positive', 'amount > 0')
export class CommitteeInstallment extends AuditBaseEntity {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ name: 'committee_id', type: 'uuid' }) committeeId: string;
  @ManyToOne(() => Committee, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'committee_id' })
  committee: Committee;
  @Column({ type: 'decimal', precision: 14, scale: 2 }) amount: string;
  @Column({ name: 'installment_date', type: 'date' }) installmentDate: string;
}
