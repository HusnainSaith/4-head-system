import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { AuditBaseEntity } from '../../../common/entities/audit-base.entity';
import { InvestorProfitAllocation } from './investor-profit-allocation.entity';

@Entity('investor_profit_distributions')
@Index('IDX_profit_distribution_allocation_date', [
  'allocationId',
  'transactionDate',
])
export class InvestorProfitDistribution extends AuditBaseEntity {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ name: 'allocation_id', type: 'uuid' }) allocationId: string;
  @ManyToOne(() => InvestorProfitAllocation, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'allocation_id' })
  allocation: InvestorProfitAllocation;
  @Column({ name: 'department_id', type: 'uuid' }) departmentId: string;
  @Column({ type: 'decimal', precision: 18, scale: 2 }) amount: string;
  @Column({
    name: 'payment_method',
    type: 'enum',
    enum: ['cash', 'bank'],
    enumName: 'investor_payment_method_enum',
  })
  paymentMethod: 'cash' | 'bank';
  @Column({ name: 'cash_account_id', type: 'uuid', nullable: true })
  cashAccountId?: string;
  @Column({ name: 'bank_account_id', type: 'uuid', nullable: true })
  bankAccountId?: string;
  @Column({
    name: 'bank_transaction_method',
    type: 'enum',
    enum: ['cheque', 'app'],
    enumName: 'bank_transaction_method_enum',
    nullable: true,
  })
  bankTransactionMethod?: 'cheque' | 'app';
  @Column({ name: 'cheque_number', nullable: true }) chequeNumber?: string;
  @Column({ name: 'app_reference', nullable: true }) appReference?: string;
  @Column({ name: 'transaction_date', type: 'date' }) transactionDate: string;
  @Column({ type: 'varchar', length: 100, nullable: true }) reference?: string;
  @Column({ type: 'varchar', length: 500, nullable: true }) notes?: string;
}
