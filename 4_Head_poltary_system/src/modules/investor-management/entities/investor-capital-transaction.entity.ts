import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { AuditBaseEntity } from '../../../common/entities/audit-base.entity';
import { BankAccount } from '../../accounts/entities/bank-account.entity';
import { CashAccount } from '../../accounts/entities/cash-account.entity';
import { Department } from '../../departments/entities/department.entity';
import { Party } from '../../parties/entities/party.entity';
import { Investor } from './investor.entity';

export enum InvestorCapitalTransactionType {
  INVESTMENT = 'investment',
  ADDITIONAL_INVESTMENT = 'additional_investment',
  CAPITAL_WITHDRAWAL = 'capital_withdrawal',
  CAPITAL_REFUND = 'capital_refund',
  MANUAL_PROFIT = 'manual_profit',
  MANUAL_LOSS = 'manual_loss',
  FARM_TRANSFER = 'farm_transfer',
}

@Entity('investor_capital_transactions')
@Index('IDX_investor_capital_investor_date', ['investorId', 'transactionDate'])
export class InvestorCapitalTransaction extends AuditBaseEntity {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ name: 'investor_id', type: 'uuid' }) investorId: string;
  @ManyToOne(() => Investor, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'investor_id' })
  investor: Investor;
  @Column({ name: 'department_id', type: 'uuid' }) departmentId: string;
  @ManyToOne(() => Department, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'department_id' })
  department: Department;
  @Column({ name: 'farm_party_id', type: 'uuid', nullable: true })
  farmPartyId?: string;
  @ManyToOne(() => Party, { nullable: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'farm_party_id' })
  farmParty?: Party;
  @Column({
    name: 'transaction_type',
    type: 'enum',
    enum: InvestorCapitalTransactionType,
    enumName: 'investor_capital_transaction_type_enum',
  })
  transactionType: InvestorCapitalTransactionType;
  @Column({ type: 'decimal', precision: 18, scale: 2 }) amount: string;
  @Column({ name: 'balance_before', type: 'decimal', precision: 18, scale: 2 })
  balanceBefore: string;
  @Column({ name: 'balance_after', type: 'decimal', precision: 18, scale: 2 })
  balanceAfter: string;
  @Column({ name: 'transaction_date', type: 'date' }) transactionDate: string;
  @Column({
    name: 'payment_method',
    type: 'enum',
    enum: ['cash', 'bank'],
    enumName: 'investor_payment_method_enum',
    nullable: true,
  })
  paymentMethod?: 'cash' | 'bank';
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
    enumName: 'bank_transaction_method_enum',
    nullable: true,
  })
  bankTransactionMethod?: 'cheque' | 'app';
  @Column({ name: 'cheque_number', nullable: true }) chequeNumber?: string;
  @Column({ name: 'app_reference', nullable: true }) appReference?: string;
  @Column({ type: 'varchar', length: 100, nullable: true }) reference?: string;
  @Column({ type: 'varchar', length: 500, nullable: true }) notes?: string;
}
