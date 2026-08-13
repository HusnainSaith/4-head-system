import {
  Check,
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { AuditBaseEntity } from '../../../common/entities/audit-base.entity';
import { ExpenseCategory } from '../../expenses/entities/expense-category.entity';
import { ExpenseAllocationSplit } from './expense-allocation-split.entity';

@Entity('expense_allocations')
@Check('chk_expense_allocation_total_positive', 'total_amount > 0')
export class ExpenseAllocation extends AuditBaseEntity {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ name: 'category_id', type: 'uuid' }) categoryId: string;
  @ManyToOne(() => ExpenseCategory, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'category_id' })
  category: ExpenseCategory;
  @Column({ name: 'total_amount', type: 'decimal', precision: 14, scale: 2 })
  totalAmount: string;
  @Column({
    name: 'allocation_method',
    type: 'enum',
    enum: ['equal', 'percentage', 'manual'],
  })
  allocationMethod: 'equal' | 'percentage' | 'manual';
  @Column({ name: 'expense_date', type: 'date' }) expenseDate: string;
  @Column({ type: 'varchar', length: 255, nullable: true })
  description?: string;
  @OneToMany(() => ExpenseAllocationSplit, (split) => split.allocation)
  splits: ExpenseAllocationSplit[];
}
