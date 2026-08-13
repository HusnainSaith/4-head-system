import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { AuditBaseEntity } from '../../../common/entities/audit-base.entity';
import { Employee } from './employee.entity';
import { SalaryWithdrawalAllocation } from './salary-withdrawal-allocation.entity';

@Entity('employee_salary_withdrawals')
export class SalaryWithdrawal extends AuditBaseEntity {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ name: 'employee_id', type: 'uuid' }) employeeId: string;
  @ManyToOne(() => Employee)
  @JoinColumn({ name: 'employee_id' })
  employee: Employee;
  @Column({ type: 'decimal', precision: 14, scale: 2 }) amount: string;
  @Column({ name: 'withdrawal_date', type: 'date' }) withdrawalDate: Date;
  @Column({ name: 'payment_method', type: 'enum', enum: ['cash', 'bank'] })
  paymentMethod: 'cash' | 'bank';
  @Column({ type: 'varchar', length: 255, nullable: true }) notes?: string;
  @OneToMany(() => SalaryWithdrawalAllocation, (item) => item.withdrawal)
  allocations: SalaryWithdrawalAllocation[];
}
