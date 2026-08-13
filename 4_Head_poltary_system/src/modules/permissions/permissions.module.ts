import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Permission } from './entities/permission.entity';
import { RolePermission } from '../role-permissions/entities/role-permission.entity';
import { UserPermission } from '../users/entities/user-permission.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Permission, RolePermission, UserPermission]),
  ],
  providers: [],
  exports: [TypeOrmModule],
})
export class PermissionsModule {}
