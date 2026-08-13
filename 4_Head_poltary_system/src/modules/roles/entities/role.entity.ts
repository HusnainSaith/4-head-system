import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { RolePermission } from '../../role-permissions/entities/role-permission.entity';
import { AuditBaseEntity } from '../../../common/entities/audit-base.entity';

@Entity('roles')
export class Role extends AuditBaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  name: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @OneToMany(() => RolePermission, (rp) => rp.role)
  rolePermissions?: RolePermission[];
}
