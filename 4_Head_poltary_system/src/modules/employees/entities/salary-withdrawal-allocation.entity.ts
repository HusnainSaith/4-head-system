import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { AuditBaseEntity } from '../../../common/entities/audit-base.entity';
import { SalaryRun } from './salary-run.entity';
import { SalaryWithdrawal } from './salary-withdrawal.entity';

@Entity('employee_salary_withdrawal_allocations')
@Unique(['withdrawalId', 'salaryRunId'])
export class SalaryWithdrawalAllocation extends AuditBaseEntity {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ name: 'withdrawal_id', type: 'uuid' }) withdrawalId: string;
  @ManyToOne(() => SalaryWithdrawal, (item) => item.allocations)
  @JoinColumn({ name: 'withdrawal_id' })
  withdrawal: SalaryWithdrawal;
  @Column({ name: 'salary_run_id', type: 'uuid' }) salaryRunId: string;
  @ManyToOne(() => SalaryRun)
  @JoinColumn({ name: 'salary_run_id' })
  salaryRun: SalaryRun;
  @Column({ type: 'decimal', precision: 14, scale: 2 }) amount: string;
}
