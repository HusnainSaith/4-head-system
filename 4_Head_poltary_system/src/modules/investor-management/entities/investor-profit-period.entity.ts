import {
  Column,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { AuditBaseEntity } from '../../../common/entities/audit-base.entity';
import { InvestorProfitAllocation } from './investor-profit-allocation.entity';

export enum InvestorProfitPeriodType {
  MONTHLY = 'monthly',
  YEARLY = 'yearly',
  CUSTOM = 'custom',
}
export enum InvestorProfitPeriodStatus {
  CALCULATED = 'calculated',
  FINALIZED = 'finalized',
  DISTRIBUTED = 'distributed',
}

@Entity('investor_profit_periods')
@Unique('UQ_investor_profit_period_dates', ['startDate', 'endDate'])
@Index('IDX_investor_profit_period_status', ['status'])
export class InvestorProfitPeriod extends AuditBaseEntity {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ name: 'department_id', type: 'uuid' }) departmentId: string;
  @Column({
    name: 'period_type',
    type: 'enum',
    enum: InvestorProfitPeriodType,
    enumName: 'investor_profit_period_type_enum',
  })
  periodType: InvestorProfitPeriodType;
  @Column({ name: 'start_date', type: 'date' }) startDate: string;
  @Column({ name: 'end_date', type: 'date' }) endDate: string;
  @Column({ name: 'gross_profit', type: 'decimal', precision: 18, scale: 2 })
  grossProfit: string;
  @Column({
    name: 'eligible_expenses',
    type: 'decimal',
    precision: 18,
    scale: 2,
  })
  eligibleExpenses: string;
  @Column({ name: 'net_profit', type: 'decimal', precision: 18, scale: 2 })
  netProfit: string;
  @Column({
    type: 'enum',
    enum: InvestorProfitPeriodStatus,
    enumName: 'investor_profit_period_status_enum',
    default: InvestorProfitPeriodStatus.CALCULATED,
  })
  status: InvestorProfitPeriodStatus;
  @Column({ name: 'calculated_at', type: 'timestamptz' }) calculatedAt: Date;
  @Column({ name: 'calculated_by', type: 'uuid' }) calculatedBy: string;
  @Column({ name: 'finalized_at', type: 'timestamptz', nullable: true })
  finalizedAt?: Date;
  @Column({ name: 'finalized_by', type: 'uuid', nullable: true })
  finalizedBy?: string;
  @OneToMany(
    () => InvestorProfitAllocation,
    (allocation) => allocation.profitPeriod,
  )
  allocations: InvestorProfitAllocation[];
}
