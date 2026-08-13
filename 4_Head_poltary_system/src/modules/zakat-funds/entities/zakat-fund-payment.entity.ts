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
import { Department } from '../../departments/entities/department.entity';

export enum ZakatFundType {
  ZAKAT = 'zakat',
  FUND = 'fund',
}

export enum ZakatFundStatus {
  ACTIVE = 'active',
  REVERSED = 'reversed',
}

@Entity('zakat_fund_payments')
export class ZakatFundPayment extends AuditBaseEntity {
  @PrimaryGeneratedColumn('uuid') id: string;

  @Column({ name: 'department_id', type: 'uuid' }) departmentId: string;
  @ManyToOne(() => Department, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'department_id' })
  department: Department;

  @Column({ name: 'account_type', type: 'enum', enum: ZakatFundType })
  accountType: ZakatFundType;

  @Column({ name: 'calendar_year', type: 'integer' }) calendarYear: number;
  @Column({ type: 'decimal', precision: 18, scale: 2 }) amount: string;
  @Column({ name: 'payment_date', type: 'date' }) paymentDate: string;
  @Column({ name: 'payment_method', type: 'enum', enum: ['cash', 'bank'] })
  paymentMethod: 'cash' | 'bank';

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
  @Column({ name: 'cheque_number', nullable: true }) chequeNumber?: string;
  @Column({ name: 'app_reference', nullable: true }) appReference?: string;
  @Column({ name: 'recipient_name', length: 150 }) recipientName: string;
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
}
