import {
  Check,
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { AuditBaseEntity } from '../../../common/entities/audit-base.entity';
import { Department } from '../../departments/entities/department.entity';
import { ExpenseAllocation } from './expense-allocation.entity';

@Entity('expense_allocation_splits')
@Unique(['allocationId', 'departmentId'])
@Check('chk_expense_allocation_split_positive', 'split_amount > 0')
export class ExpenseAllocationSplit extends AuditBaseEntity {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ name: 'allocation_id', type: 'uuid' }) allocationId: string;
  @ManyToOne(() => ExpenseAllocation, (allocation) => allocation.splits, {
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'allocation_id' })
  allocation: ExpenseAllocation;
  @Column({ name: 'department_id', type: 'uuid' }) departmentId: string;
  @ManyToOne(() => Department, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'department_id' })
  department: Department;
  @Column({ name: 'split_amount', type: 'decimal', precision: 14, scale: 2 })
  splitAmount: string;
}
