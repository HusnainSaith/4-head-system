import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { AuditBaseEntity } from '../../../common/entities/audit-base.entity';
import { Expense } from './expense.entity';

@Entity('expense_categories')
export class ExpenseCategory extends AuditBaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true, length: 100 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({
    type: 'enum',
    enum: [
      'operational',
      'maintenance',
      'transport',
      'administrative',
      'miscellaneous',
    ],
    name: 'category_type',
  })
  categoryType:
    | 'operational'
    | 'maintenance'
    | 'transport'
    | 'administrative'
    | 'miscellaneous';

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ name: 'is_system_generated', default: false })
  isSystemGenerated: boolean;

  @OneToMany(() => Expense, (expense) => expense.category)
  expenses: Expense[];
}
