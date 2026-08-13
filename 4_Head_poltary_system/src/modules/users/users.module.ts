import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { UsersRepository } from './users.repository';
import { User } from './entities/user.entity';
import { UserPermission } from './entities/user-permission.entity';
import { Role } from '../roles/entities/role.entity';
import { Permission } from '../permissions/entities/permission.entity';
import { TokenUtil } from '../../common/utils/jwt.util';
import { GuardsModule } from '../../common/modules/guards.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, UserPermission, Role, Permission]),
    GuardsModule,

    JwtModule.register({
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: process.env.JWT_EXPIRES_IN },
    }),
  ],
  controllers: [UsersController],
  providers: [UsersService, TokenUtil, UsersRepository],
  exports: [UsersService, TokenUtil, TypeOrmModule, UsersRepository],
})
export class UsersModule {}
