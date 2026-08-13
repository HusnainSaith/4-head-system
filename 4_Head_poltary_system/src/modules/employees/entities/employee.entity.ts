import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { AuditBaseEntity } from '../../../common/entities/audit-base.entity';
import { Department } from '../../departments/entities/department.entity';
import { User } from '../../users/entities/user.entity';

/**
 * Employee entity - stores employee information for all departments.
 *
 * NOTE ON FIELD CONSISTENCY:
 * - fullName is the authoritative name field (derived from linked User if present)
 * - firstName/lastName are legacy/deprecated - do not use for new functionality
 * - phone is the authoritative phone field
 * - phoneNumber is legacy/deprecated - do not use
 * - baseSalary is the authoritative salary field
 * - monthlySalary is legacy/deprecated - do not use
 * - joiningDate is the authoritative join date
 * - joinDate is legacy/deprecated - do not use
 */
@Entity('employees')
@Index(['employeeCode'], { unique: true, where: 'employee_code IS NOT NULL' })
@Index(['userId'], { unique: true, where: 'user_id IS NOT NULL' })
export class Employee extends AuditBaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** Link to system user (optional - employee may exist without a login) */
  @Column({ name: 'user_id', type: 'uuid', nullable: true })
  userId?: string;

  @ManyToOne(() => User, { nullable: true, cascade: false })
  @JoinColumn({ name: 'user_id' })
  user?: User;

  @Column({ name: 'department_id', type: 'uuid', nullable: true })
  departmentId?: string;

  @ManyToOne(() => Department, { nullable: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'department_id' })
  department?: Department;

  /** Unique employee identifier within the organization */
  @Column({ name: 'employee_code', length: 50, nullable: true })
  employeeCode?: string;

  /** Authoritative full name - sync with linked User.fullName if userId is set */
  @Column({ name: 'full_name', length: 200 })
  fullName: string;

  /** Job title/position */
  @Column({ length: 120 })
  designation: string;

  /** Authoritative phone number */
  @Column({ length: 50, nullable: true })
  phone?: string;

  /** National ID or other identification number */
  @Column({ name: 'cnic_or_id_number', length: 100, nullable: true })
  cnicOrIdNumber?: string;

  /** Authoritative monthly base salary */
  @Column({ name: 'base_salary', type: 'decimal', precision: 14, scale: 2 })
  baseSalary: string;

  /** Authoritative employment start date */
  @Column({ name: 'joining_date', type: 'date' })
  joiningDate: Date;

  // --- DEPRECATED FIELDS (keeping for backward compatibility) ---
  // These fields are maintained for legacy data but should not be used in new code
  // Use fullName instead
  @Column({ name: 'first_name', length: 100, nullable: true })
  firstName?: string;

  // Use fullName instead
  @Column({ name: 'last_name', length: 100, nullable: true })
  lastName?: string;

  // This field is nullable but should probably not be stored here since User has email
  @Column({ length: 255, nullable: true })
  email?: string;

  // Use phone instead
  @Column({ name: 'phone_number', length: 50, nullable: true })
  phoneNumber?: string;

  // Use baseSalary instead
  @Column({
    name: 'monthly_salary',
    type: 'decimal',
    precision: 14,
    scale: 2,
    nullable: true,
  })
  monthlySalary?: string;

  /** Optional daily wage for casual/part-time workers */
  @Column({
    name: 'daily_wage',
    type: 'decimal',
    precision: 14,
    scale: 2,
    nullable: true,
  })
  dailyWage?: string;

  /** Employment status: active, inactive, terminated, on_leave */
  @Column({ length: 50, default: 'active' })
  status: string;

  // Use joiningDate instead
  @Column({ name: 'join_date', type: 'date', nullable: true })
  joinDate?: Date;

  @Column({ name: 'separation_date', type: 'date', nullable: true })
  separationDate?: Date;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ type: 'text', nullable: true })
  address?: string;
}
