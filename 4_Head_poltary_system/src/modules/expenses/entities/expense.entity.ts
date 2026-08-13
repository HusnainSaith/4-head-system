import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { AuditBaseEntity } from '../../../common/entities/audit-base.entity';
import { Department } from '../../departments/entities/department.entity';
import { ExpenseCategory } from './expense-category.entity';

@Entity('expenses')
export class Expense extends AuditBaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'department_id', type: 'uuid' })
  departmentId: string;

  @ManyToOne(() => Department, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'department_id' })
  department: Department;

  @Column({ name: 'category_id', type: 'uuid' })
  categoryId: string;

  @ManyToOne(() => ExpenseCategory, (category) => category.expenses)
  @JoinColumn({ name: 'category_id' })
  category: ExpenseCategory;

  @Column({ type: 'decimal', precision: 14, scale: 2 })
  amount: string; // Always DECIMAL for financial values

  @Column({
    name: 'payment_method',
    type: 'enum',
    enum: ['cash', 'bank'],
    default: 'cash',
  })
  paymentMethod: 'cash' | 'bank';

  @Column({ name: 'expense_date', type: 'date' })
  expenseDate: Date;

  @Column({
    name: 'source_type',
    type: 'varchar',
    length: 40,
    default: 'manual',
  })
  sourceType:
    | 'manual'
    | 'vehicle_fuel'
    | 'vehicle_maintenance'
    | 'stock_writeoff'
    | 'processing_loss'
    | 'allocation';

  @Column({ name: 'source_id', type: 'uuid', nullable: true })
  sourceId?: string;

  @Column({ length: 255, nullable: true })
  description?: string;

  @Column({ name: 'receipt_reference', length: 100, nullable: true })
  receiptReference?: string;

  @Column({ name: 'is_approved', default: false })
  isApproved: boolean;

  @Column({ name: 'approved_by', type: 'uuid', nullable: true })
  approvedBy?: string;

  @Column({ name: 'approved_at', type: 'timestamptz', nullable: true })
  approvedAt?: Date;

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
