import {
  Check,
  Column,
  Entity,
  ManyToOne,
  JoinColumn,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { AuditBaseEntity } from '../../../common/entities/audit-base.entity';
import { Department } from '../../departments/entities/department.entity';

@Entity('committees')
@Check('chk_committee_installment_positive', 'installment_amount > 0')
@Check('chk_committee_members_positive', 'total_members > 0')
@Check(
  'chk_committee_position_valid',
  'payout_position > 0 AND payout_position <= total_members',
)
export class Committee extends AuditBaseEntity {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ name: 'department_id', type: 'uuid' }) departmentId: string;
  @ManyToOne(() => Department, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'department_id' })
  department: Department;
  @Column({ type: 'varchar', length: 150 }) name: string;
  @Column({
    name: 'installment_amount',
    type: 'decimal',
    precision: 14,
    scale: 2,
  })
  installmentAmount: string;
  @Column({ name: 'total_members', type: 'smallint' }) totalMembers: number;
  @Column({ name: 'payout_position', type: 'smallint' }) payoutPosition: number;
  @Column({ name: 'start_date', type: 'date' }) startDate: string;
  @Column({
    type: 'enum',
    enum: ['active', 'completed', 'defaulted'],
    default: 'active',
  })
  status: 'active' | 'completed' | 'defaulted';
}
