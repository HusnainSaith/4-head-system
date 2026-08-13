import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { AuditBaseEntity } from '../../../common/entities/audit-base.entity';
import { Department } from '../../departments/entities/department.entity';
import { ZakatFundStatus, ZakatFundType } from './zakat-fund-payment.entity';
import { ZakatFundSettlementSplit } from './zakat-fund-settlement-split.entity';

export enum ZakatFundAllocationMethod {
  EQUAL = 'equal',
  PERCENTAGE = 'percentage',
  MANUAL = 'manual',
}

@Entity('zakat_fund_settlements')
export class ZakatFundSettlement extends AuditBaseEntity {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ name: 'department_id', type: 'uuid' }) departmentId: string;
  @ManyToOne(() => Department, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'department_id' })
  department: Department;
  @Column({ name: 'account_type', type: 'enum', enum: ZakatFundType })
  accountType: ZakatFundType;
  @Column({ name: 'calendar_year', type: 'integer' }) calendarYear: number;
  @Column({ name: 'total_amount', type: 'decimal', precision: 18, scale: 2 })
  totalAmount: string;
  @Column({ name: 'settlement_date', type: 'date' }) settlementDate: string;
  @Column({
    name: 'allocation_method',
    type: 'enum',
    enum: ZakatFundAllocationMethod,
  })
  allocationMethod: ZakatFundAllocationMethod;
  @Column({ length: 100, nullable: true }) reference?: string;
  @Column({ length: 500, nullable: true }) notes?: string;
  @Column({
    type: 'enum',
    enum: ZakatFundStatus,
    default: ZakatFundStatus.ACTIVE,
  })
  status: ZakatFundStatus;
  @Column({ name: 'reversal_reason', length: 500, nullable: true })
  reversalReason?: string;
  @Column({ name: 'reversed_at', type: 'timestamptz', nullable: true })
  reversedAt?: Date;
  @Column({ name: 'reversed_by', type: 'uuid', nullable: true })
  reversedBy?: string;
  @OneToMany(() => ZakatFundSettlementSplit, (split) => split.settlement, {
    cascade: true,
  })
  splits: ZakatFundSettlementSplit[];
}
