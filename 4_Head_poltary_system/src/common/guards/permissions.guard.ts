import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../modules/users/entities/user.entity';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { RoleEnum } from '../enums/role.enum';

@Injectable()
export class PermissionsGuard implements CanActivate {
  private readonly logger = new Logger(PermissionsGuard.name);

  constructor(
    private reflector: Reflector,
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user || !user.id) {
      throw new UnauthorizedException('User not authenticated');
    }

    // Owner is the documented full-access role. Do not make owner access
    // depend on optional role_permissions seed data being present.
    const roleName =
      typeof user.role === 'string' ? user.role : user.role?.name;
    if (roleName === RoleEnum.OWNER) {
      return true;
    }

    try {
      // Use raw SQL with snake_case column names that match your database
      const userPermissions = await this.userRepository.manager.query(
        `
        SELECT DISTINCT p.name 
        FROM permissions p
        WHERE p.id IN (
          -- Permissions from user's role
          SELECT rp.permission_id 
          FROM role_permissions rp
          JOIN users u ON u.role_id = rp.role_id
          WHERE u.id = $1
          
          UNION
          
          -- Direct user permissions
          SELECT up.permission_id
          FROM user_permissions up
          WHERE up.user_id = $1
        )
        `,
        [user.id],
      );

      const permissionNames = new Set(
        userPermissions.map((row: any) => row.name),
      );

      // Check if user has required permissions
      const hasPermission = requiredPermissions.some((permission) => {
        const found = permissionNames.has(permission);

        return found;
      });

      if (!hasPermission) {
        throw new ForbiddenException(
          `Access denied. Required permissions: ${requiredPermissions.join(', ')}`,
        );
      }

      this.logger.log('PERMISSION GRANTED');
      request.userPermissions = Array.from(permissionNames);

      return true;
    } catch (error) {
      if (
        error instanceof ForbiddenException ||
        error instanceof UnauthorizedException
      ) {
        throw error;
      }
      throw new ForbiddenException('Permission validation failed');
    }
  }
}
