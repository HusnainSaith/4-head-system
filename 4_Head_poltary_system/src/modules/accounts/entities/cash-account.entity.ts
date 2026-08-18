import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { AuditBaseEntity } from '../../../common/entities/audit-base.entity';
import { Department } from '../../departments/entities/department.entity';

@Entity('cash_accounts')
export class CashAccount extends AuditBaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'department_id', type: 'uuid', nullable: true })
  departmentId?: string;

  @ManyToOne(() => Department, { nullable: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'department_id' })
  department?: Department;

  @Column({ name: 'account_name' })
  accountName: string;

  @Column({
    name: 'opening_balance',
    type: 'decimal',
    precision: 14,
    scale: 2,
    default: 0,
  })
  openingBalance: string;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ name: 'is_shared', default: false })
  isShared: boolean;
}
