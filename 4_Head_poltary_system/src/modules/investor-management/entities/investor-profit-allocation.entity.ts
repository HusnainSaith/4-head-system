import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { AuditBaseEntity } from '../../../common/entities/audit-base.entity';
import { Investor } from './investor.entity';
import { InvestorProfitPeriod } from './investor-profit-period.entity';

export enum InvestorProfitAllocationStatus {
  PENDING = 'pending',
  PARTIALLY_DISTRIBUTED = 'partially_distributed',
  DISTRIBUTED = 'distributed',
}

@Entity('investor_profit_allocations')
@Unique('UQ_profit_period_investor', ['profitPeriodId', 'investorId'])
@Index('IDX_profit_allocation_investor_status', ['investorId', 'status'])
export class InvestorProfitAllocation extends AuditBaseEntity {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ name: 'profit_period_id', type: 'uuid' }) profitPeriodId: string;
  @ManyToOne(() => InvestorProfitPeriod, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'profit_period_id' })
  profitPeriod: InvestorProfitPeriod;
  @Column({ name: 'investor_id', type: 'uuid' }) investorId: string;
  @ManyToOne(() => Investor, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'investor_id' })
  investor: Investor;
  @Column({
    name: 'net_profit_snapshot',
    type: 'decimal',
    precision: 18,
    scale: 2,
  })
  netProfitSnapshot: string;
  @Column({
    name: 'profit_share_percentage_snapshot',
    type: 'decimal',
    precision: 7,
    scale: 4,
  })
  profitSharePercentageSnapshot: string;
  @Column({ name: 'profit_amount', type: 'decimal', precision: 18, scale: 2 })
  profitAmount: string;
  @Column({
    name: 'distributed_amount',
    type: 'decimal',
    precision: 18,
    scale: 2,
    default: 0,
  })
  distributedAmount: string;
  @Column({
    name: 'remaining_amount',
    type: 'decimal',
    precision: 18,
    scale: 2,
  })
  remainingAmount: string;
  @Column({
    type: 'enum',
    enum: InvestorProfitAllocationStatus,
    enumName: 'investor_profit_allocation_status_enum',
    default: InvestorProfitAllocationStatus.PENDING,
  })
  status: InvestorProfitAllocationStatus;
}
