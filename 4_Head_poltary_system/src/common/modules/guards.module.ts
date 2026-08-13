import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../../modules/users/entities/user.entity';
import { PermissionsGuard } from '../guards/permissions.guard';
import { RolesGuard } from '../guards/roles.guard';
import { PublicGuard } from '../guards/public.guard';

@Module({
  imports: [TypeOrmModule.forFeature([User])],
  providers: [PermissionsGuard, RolesGuard, PublicGuard],
  exports: [PermissionsGuard, RolesGuard, PublicGuard],
})
export class GuardsModule {}
