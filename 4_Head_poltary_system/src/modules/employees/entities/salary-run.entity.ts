import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { AuditBaseEntity } from '../../../common/entities/audit-base.entity';
import { Employee } from './employee.entity';

@Entity('salary_runs')
@Unique(['employeeId', 'periodMonth', 'periodYear'])
export class SalaryRun extends AuditBaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'employee_id', type: 'uuid' })
  employeeId: string;

  @ManyToOne(() => Employee)
  @JoinColumn({ name: 'employee_id' })
  employee: Employee;

  @Column({ name: 'period_month', type: 'smallint' })
  periodMonth: number;

  @Column({ name: 'period_year', type: 'smallint' })
  periodYear: number;

  @Column({ name: 'base_salary', type: 'decimal', precision: 14, scale: 2 })
  baseSalary: string;

  @Column({
    name: 'total_bonuses',
    type: 'decimal',
    precision: 14,
    scale: 2,
    default: '0',
  })
  totalBonuses: string;

  @Column({
    name: 'total_advances_deducted',
    type: 'decimal',
    precision: 14,
    scale: 2,
    default: '0',
  })
  totalAdvancesDeducted: string;

  @Column({ name: 'net_payable', type: 'decimal', precision: 14, scale: 2 })
  netPayable: string;

  @Column({
    name: 'payment_status',
    type: 'enum',
    enum: ['pending', 'partially_paid', 'paid'],
    default: 'pending',
  })
  paymentStatus: 'pending' | 'partially_paid' | 'paid';

  @Column({
    name: 'amount_paid',
    type: 'decimal',
    precision: 14,
    scale: 2,
    default: 0,
  })
  amountPaid: string;

  @Column({ name: 'paid_date', type: 'date', nullable: true })
  paidDate?: Date;

  @Column({
    name: 'payment_method',
    type: 'enum',
    enum: ['cash', 'bank'],
    nullable: true,
  })
  paymentMethod?: 'cash' | 'bank';

  @Column({ name: 'cash_account_id', type: 'uuid', nullable: true })
  cashAccountId?: string;
  @Column({ name: 'bank_account_id', type: 'uuid', nullable: true })
  bankAccountId?: string;
  @Column({
    name: 'bank_transaction_method',
    type: 'enum',
    enum: ['cheque', 'app'],
    nullable: true,
  })
  bankTransactionMethod?: 'cheque' | 'app';
  @Column({ name: 'cheque_number', nullable: true }) chequeNumber?: string;
  @Column({ name: 'app_reference', nullable: true }) appReference?: string;
}
