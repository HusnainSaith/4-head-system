import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { RolePermission } from '../../role-permissions/entities/role-permission.entity';
import { UserPermission } from '../../users/entities/user-permission.entity';

@Entity('permissions')
export class Permission {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  name: string;

  @Column({ nullable: true })
  description?: string;

  @Column({ nullable: true })
  resource?: string;

  @Column({ nullable: true })
  action?: string;

  @OneToMany(() => RolePermission, (rp) => rp.permission)
  rolePermissions?: RolePermission[];

  @OneToMany(() => UserPermission, (up) => up.permission)
  userPermissions?: UserPermission[];
}
