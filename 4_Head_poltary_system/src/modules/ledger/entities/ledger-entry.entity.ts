import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
  CreateDateColumn,
} from 'typeorm';
import { ChartOfAccount } from './chart-of-account.entity';
import { Department } from '../../departments/entities/department.entity';
import { Party } from '../../parties/entities/party.entity';
import { CashAccount } from '../../accounts/entities/cash-account.entity';
import { BankAccount } from '../../accounts/entities/bank-account.entity';

@Entity('ledger_entries')
@Index(['departmentId', 'entryDate'])
@Index(['partyId'])
@Index(['sourceType', 'sourceId'])
export class LedgerEntry {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'department_id' })
  departmentId: string;

  @ManyToOne(() => Department, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'department_id' })
  department: Department;

  @Column({ name: 'account_id' })
  accountId: string;

  @ManyToOne(() => ChartOfAccount)
  @JoinColumn({ name: 'account_id' })
  account: ChartOfAccount;

  @Column({ name: 'party_id', type: 'uuid', nullable: true })
  partyId?: string;

  @ManyToOne(() => Party, { nullable: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'party_id' })
  party?: Party;

  @Column({ type: 'enum', enum: ['debit', 'credit'], name: 'entry_type' })
  entryType: 'debit' | 'credit';

  @Column({ type: 'decimal', precision: 14, scale: 2 })
  amount: string;

  @Column({ name: 'entry_date', type: 'date' })
  entryDate: string;

  @Column({
    type: 'enum',
    enum: [
      'purchase',
      'sale',
      'internal_transfer',
      'payment',
      'expense',
      'salary',
      'advance',
      'bonus',
      'stock_writeoff',
      'opening_balance',
      'salary_withdrawal',
      'committee',
      'investment',
      'brother_adjustment',
      'investor_capital',
      'investor_profit',
      'zakat_fund',
    ],
    name: 'source_type',
  })
  sourceType:
    | 'purchase'
    | 'sale'
    | 'internal_transfer'
    | 'payment'
    | 'expense'
    | 'salary'
    | 'advance'
    | 'bonus'
    | 'stock_writeoff'
    | 'opening_balance'
    | 'salary_withdrawal'
    | 'committee'
    | 'investment'
    | 'brother_adjustment'
    | 'investor_capital'
    | 'investor_profit'
    | 'zakat_fund';

  @Column({ name: 'source_id', type: 'uuid' })
  sourceId: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  description?: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  createdBy?: string;

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

  @Column({ name: 'cheque_number', nullable: true })
  chequeNumber?: string;

  @Column({ name: 'app_reference', nullable: true })
  appReference?: string;
  // NO updatedAt, NO deletedAt — IMMUTABLE, append-only table
}
