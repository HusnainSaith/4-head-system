import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { AuditBaseEntity } from '../../../common/entities/audit-base.entity';
import { Department } from '../../departments/entities/department.entity';
import { Role } from '../../roles/entities/role.entity';
import { UserPermission } from './user-permission.entity';

@Entity('users')
export class User extends AuditBaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'full_name' })
  fullName: string;

  @Column({ unique: true })
  email: string;

  @Column({ name: 'password_hash', select: false })
  passwordHash: string;

  @Column({ nullable: true })
  phone: string;

  @Column({ name: 'role_id', type: 'uuid', nullable: true })
  roleId?: string;

  @ManyToOne(() => Role, { nullable: true })
  @JoinColumn({ name: 'role_id' })
  role?: Role;

  @Column({ name: 'department_id', type: 'uuid', nullable: true })
  departmentId?: string;

  @ManyToOne(() => Department, { nullable: true })
  @JoinColumn({ name: 'department_id' })
  department?: Department;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  // Transient property for permissions (populated at runtime)
  permissions?: any[];

  @OneToMany(() => UserPermission, (up) => up.user)
  userPermissions?: UserPermission[];
  // AuditBaseEntity provides: createdAt, updatedAt, deletedAt, createdBy, updatedBy
}
