import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { AuditBaseEntity } from '../../../common/entities/audit-base.entity';
import { Employee } from './employee.entity';

@Entity('employee_advances')
export class EmployeeAdvance extends AuditBaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'employee_id', type: 'uuid' })
  employeeId: string;

  @ManyToOne(() => Employee)
  @JoinColumn({ name: 'employee_id' })
  employee: Employee;

  @Column({ type: 'decimal', precision: 14, scale: 2 })
  amount: string;

  @Column({ name: 'advance_date', type: 'date' })
  advanceDate: Date;

  @Column({ type: 'text', nullable: true })
  reason?: string;

  @Column({
    name: 'recovery_status',
    type: 'enum',
    enum: ['outstanding', 'partially_recovered', 'fully_recovered'],
    default: 'outstanding',
  })
  recoveryStatus: 'outstanding' | 'partially_recovered' | 'fully_recovered';

  @Column({
    name: 'amount_recovered',
    type: 'decimal',
    precision: 14,
    scale: 2,
    default: '0',
  })
  amountRecovered: string;

  @Column({
    name: 'disbursement_status',
    type: 'enum',
    enum: ['pending', 'confirmed'],
    default: 'pending',
  })
  disbursementStatus: 'pending' | 'confirmed';

  @Column({ name: 'confirmed_at', type: 'timestamptz', nullable: true })
  confirmedAt?: Date;

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
