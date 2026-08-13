import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { AuditBaseEntity } from '../../../common/entities/audit-base.entity';
import { BankAccount } from '../../accounts/entities/bank-account.entity';
import { CashAccount } from '../../accounts/entities/cash-account.entity';
import { InvestmentAssignment } from './investment-assignment.entity';

@Entity('investment_payments')
export class InvestmentPayment extends AuditBaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'assignment_id', type: 'uuid' })
  assignmentId: string;

  @ManyToOne(() => InvestmentAssignment, (assignment) => assignment.payments, {
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'assignment_id' })
  assignment: InvestmentAssignment;

  @Column({ type: 'decimal', precision: 14, scale: 2 })
  amount: string;

  @Column({ name: 'payment_method', type: 'enum', enum: ['cash', 'bank'] })
  paymentMethod: 'cash' | 'bank';

  @Column({ name: 'payment_date', type: 'date' })
  paymentDate: string;

  @Column({ name: 'cash_account_id', type: 'uuid', nullable: true })
  cashAccountId?: string;

  @ManyToOne(() => CashAccount, { nullable: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'cash_account_id' })
  cashAccount?: CashAccount;

  @Column({ name: 'bank_account_id', type: 'uuid', nullable: true })
  bankAccountId?: string;

  @ManyToOne(() => BankAccount, { nullable: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'bank_account_id' })
  bankAccount?: BankAccount;

  @Column({
    name: 'bank_transaction_method',
    type: 'enum',
    enum: ['cheque', 'app'],
    nullable: true,
  })
  bankTransactionMethod?: 'cheque' | 'app';

  @Column({ name: 'cheque_number', type: 'varchar', nullable: true })
  chequeNumber?: string;

  @Column({ name: 'app_reference', type: 'varchar', nullable: true })
  appReference?: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  notes?: string;
}
