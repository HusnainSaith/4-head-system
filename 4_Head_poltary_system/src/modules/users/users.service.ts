import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { QueryDeepPartialEntity } from 'typeorm';
import { User } from './entities/user.entity';
import { UsersRepository } from './users.repository';
import { Role } from '../roles/entities/role.entity';
import { Permission } from '../permissions/entities/permission.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { CreateUserWithPermissionsDto } from './dto/create-user-with-permissions.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import {
  AssignmentActionEnum,
  AssignPermissionsDto,
} from './dto/assign-permissions.dto';
import { SecurityUtil } from '../../common/utils/security.util';
import { ServiceResponse } from '../../common/interfaces/service-response.interface';
import * as bcrypt from 'bcryptjs';
import { RoleEnum } from '../../common/enums/role.enum';
import { PARTY_USER_ROLE_NAMES } from '../../common/types/party-type.enum';

type UserWithPassword = User & { passwordHash: string };

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(private readonly usersRepo: UsersRepository) {}

  private get userRepository() {
    return this.usersRepo.userRepository;
  }

  private get usersRepository() {
    return this.usersRepo;
  }

  private get roleRepository() {
    return this.usersRepo.roleRepository;
  }

  private get permissionRepository() {
    return this.usersRepo.permissionRepository;
  }

  private get userPermissionRepository() {
    return this.usersRepo.userPermissionRepository;
  }

  async create(dto: CreateUserDto): Promise<ServiceResponse<User>> {
    try {
      SecurityUtil.validateObject(dto);

      const existingUser = await this.userRepository.findOne({
        where: { email: dto.email },
      });

      if (existingUser) {
        throw new ConflictException(
          'A user with this email address already exists',
        );
      }

      await this.ensureUniqueFullName(dto.fullName);

      let role: Role | undefined;
      if (dto.roleId) {
        const validRoleId = SecurityUtil.validateId(dto.roleId);
        role = await this.roleRepository.findOne({
          where: { id: validRoleId },
        });
        if (!role) {
          throw new NotFoundException('Specified role not found');
        }
      }

      const hashedPassword = await bcrypt.hash(dto.password, 10);

      const roleName = role?.name.toLowerCase();
      const departmentRequired =
        roleName === RoleEnum.DEPARTMENT_STAFF || roleName === 'driver';
      if (departmentRequired && !dto.departmentId) {
        throw new BadRequestException(
          'Department is required for department staff users',
        );
      }

      const savedUser = await this.usersRepository.createUser({
        ...dto,
        departmentId:
          roleName === RoleEnum.OWNER || roleName === RoleEnum.ACCOUNTANT
            ? null
            : (dto.departmentId ?? null),
        passwordHash: hashedPassword,
        role,
      } as Partial<User> & CreateUserDto);
      const safeUser = await this.usersRepository.findById(savedUser.id, [
        'role',
        'department',
      ]);
      return {
        success: true,
        message: 'User created successfully',
        data: safeUser as User,
      };
    } catch (error) {
      if (
        error instanceof ConflictException ||
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      throw new Error(`Failed to create user: ${error.message}`);
    }
  }

  async findByEmail(
    email: string,
    options?: { includePassword?: boolean; relations?: string[] },
  ): Promise<User | UserWithPassword | null> {
    try {
      const relations = options?.relations ?? ['role', 'department'];
      const user = await this.usersRepository.findByEmail(
        email.toLowerCase().trim(),
        options?.includePassword,
        relations,
      );
      return user as UserWithPassword;
    } catch (error) {
      throw new Error(`Failed to find user by email: ${error.message}`);
    }
  }

  async updatePassword(userId: string, hashedPassword: string): Promise<void> {
    try {
      const validUserId = SecurityUtil.validateId(userId);

      const result = await this.userRepository.update({ id: validUserId }, {
        passwordHash: hashedPassword,
      } as QueryDeepPartialEntity<User>);

      if (result.affected === 0) {
        throw new NotFoundException('User not found');
      }
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new Error(`Failed to update password: ${error.message}`);
    }
  }

  async createWithPermissions(
    dto: CreateUserWithPermissionsDto,
  ): Promise<ServiceResponse<User>> {
    try {
      SecurityUtil.validateObject(dto);

      const existingUser = await this.userRepository.findOne({
        where: { email: dto.email },
      });

      if (existingUser) {
        throw new ConflictException(
          'A user with this email address already exists',
        );
      }

      let role: Role | undefined;
      if (dto.roleId) {
        const validRoleId = SecurityUtil.validateId(dto.roleId);
        role = await this.roleRepository.findOne({
          where: { id: validRoleId },
        });
        if (!role) {
          throw new NotFoundException('Specified role not found');
        }
      }

      const hashedPassword = await bcrypt.hash(dto.password, 10);

      const savedUser = await this.usersRepository.createUser({
        email: dto.email,
        passwordHash: hashedPassword,
        fullName: dto.fullName,
        role,
      } as Partial<User> & CreateUserDto);

      if (dto.permissionIds && dto.permissionIds.length > 0) {
        const permissions = await this.permissionRepository.findByIds(
          dto.permissionIds,
        );

        if (permissions.length !== dto.permissionIds.length) {
          const foundIds = permissions.map((p) => p.id);
          const missingIds = dto.permissionIds.filter(
            (id) => !foundIds.includes(id),
          );
          throw new BadRequestException(
            `The following permission IDs do not exist: ${missingIds.join(
              ', ',
            )}.`,
          );
        }

        const userPermissionsToCreate = permissions.map((permission) =>
          this.userPermissionRepository.create({
            user: savedUser,
            permission,
          }),
        );

        await this.userPermissionRepository.save(userPermissionsToCreate);
      }

      const userWithRelations = await this.findOneWithPermissions(savedUser.id);
      return {
        success: true,
        message: 'User created with permissions successfully',
        data: userWithRelations,
      };
    } catch (error) {
      if (
        error instanceof ConflictException ||
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      throw new Error(
        `Failed to create user with permissions: ${error.message}`,
      );
    }
  }

  async assignPermissions(
    userId: string,
    dto: AssignPermissionsDto,
  ): Promise<ServiceResponse<User>> {
    try {
      const validUserId = SecurityUtil.validateId(userId);
      SecurityUtil.validateObject(dto);

      const user = await this.userRepository
        .createQueryBuilder('user')
        .leftJoinAndSelect('user.role', 'role')
        .leftJoinAndSelect('role.rolePermissions', 'rolePermissions')
        .leftJoinAndSelect('rolePermissions.permission', 'rolePermission')
        .where('user.id = :id', { id: validUserId })
        .getOne();

      if (!user) {
        throw new NotFoundException('User not found');
      }

      const permissionNames = dto.actions.map(
        (action) => `${dto.feature.toLowerCase()}.${action}`,
      );

      const permissions = await this.userRepository.manager.query(
        `SELECT id, name FROM permissions WHERE name = ANY($1)`,
        [permissionNames],
      );

      const foundPermissionNames = permissions.map(
        (permission) => permission.name,
      );
      const missingNames = permissionNames.filter(
        (name) => !foundPermissionNames.includes(name),
      );

      if (missingNames.length > 0) {
        throw new BadRequestException(
          `The following permissions do not exist: ${missingNames.join(', ')}.`,
        );
      }

      const permissionIds = permissions.map((p) => p.id);

      if (dto.assignmentAction === AssignmentActionEnum.ADD) {
        const rolePermissionNames =
          user.role?.rolePermissions
            ?.map((rolePermission) => rolePermission.permission?.name)
            .filter(Boolean) || [];
        const redundantPermissions = permissionNames.filter((name) =>
          rolePermissionNames.includes(name),
        );

        if (redundantPermissions.length > 0) {
          throw new BadRequestException(
            `Cannot add permissions ${redundantPermissions.join(', ')} as they are already granted through the user's role: ${user.role.name}.`,
          );
        }
      }

      switch (dto.assignmentAction) {
        case AssignmentActionEnum.ADD:
          await this.addUserPermissions(validUserId, permissionIds);
          break;
        case AssignmentActionEnum.REMOVE:
          await this.removeUserPermissions(validUserId, permissionIds);
          break;
        case AssignmentActionEnum.REPLACE:
          await this.replaceUserFeaturePermissions(
            validUserId,
            dto.feature,
            permissionIds,
          );
          break;
        default:
          await this.addUserPermissions(validUserId, permissionIds);
      }

      const updatedUser = await this.findOneWithPermissions(validUserId);
      return {
        success: true,
        message: `Permissions for ${dto.feature} ${dto.assignmentAction || 'assigned'} successfully`,
        data: updatedUser,
      };
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      throw new Error(`Failed to assign permissions: ${error.message}`);
    }
  }

  private async addUserPermissions(
    userId: string,
    permissionIds: string[],
  ): Promise<void> {
    for (const permissionId of permissionIds) {
      await this.userRepository.manager.query(
        `INSERT INTO user_permissions (user_id, permission_id, created_at)
         VALUES ($1, $2, NOW())
         ON CONFLICT (user_id, permission_id) DO NOTHING`,
        [userId, permissionId],
      );
    }
  }

  private async removeUserPermissions(
    userId: string,
    permissionIds: string[],
  ): Promise<void> {
    if (permissionIds.length === 0) return;

    await this.userRepository.manager.query(
      `DELETE FROM user_permissions
       WHERE user_id = $1 AND permission_id = ANY($2)`,
      [userId, permissionIds],
    );
  }

  private async replaceUserFeaturePermissions(
    userId: string,
    feature: string,
    newPermissionIds: string[],
  ): Promise<void> {
    await this.userRepository.manager.transaction(
      async (transactionManager) => {
        await transactionManager.query(
          `DELETE FROM user_permissions up
           WHERE up.user_id = $1
           AND up.permission_id IN (
             SELECT p.id FROM permissions p
             WHERE p.resource = $2
           )`,
          [userId, feature],
        );

        for (const permissionId of newPermissionIds) {
          await transactionManager.query(
            `INSERT INTO user_permissions (user_id, permission_id, created_at)
             VALUES ($1, $2, NOW())`,
            [userId, permissionId],
          );
        }
      },
    );
  }

  async getAvailableActionsForFeature(feature: string): Promise<string[]> {
    try {
      const actions = await this.userRepository.manager.query(
        `SELECT DISTINCT action FROM permissions WHERE resource = $1 ORDER BY action`,
        [feature],
      );

      return actions.map((row) => row.action);
    } catch (error) {
      throw new Error(
        `Failed to get available actions for feature ${feature}: ${error.message}`,
      );
    }
  }

  async getAvailableFeatures(): Promise<
    ServiceResponse<{ feature: string; actions: string[] }[]>
  > {
    try {
      const features = await this.userRepository.manager.query(`
        SELECT
          resource as feature,
          array_agg(DISTINCT action ORDER BY action) as actions,
          count(*) as permission_count
        FROM permissions
        GROUP BY resource
        ORDER BY resource
      `);

      const result = features.map((row) => ({
        feature: row.feature,
        actions: row.actions,
        permissionCount: parseInt(row.permission_count),
      }));

      return {
        success: true,
        message: 'Available features retrieved successfully',
        data: result,
      };
    } catch (error) {
      throw new Error(`Failed to get available features: ${error.message}`);
    }
  }

  async findOneWithPermissions(id: string): Promise<User> {
    try {
      const validId = SecurityUtil.validateId(id);

      const user = await this.userRepository
        .createQueryBuilder('user')
        .leftJoinAndSelect('user.role', 'role')
        .where('user.id = :id', { id: validId })
        .getOne();

      if (!user) {
        throw new NotFoundException('User not found');
      }

      let allPermissions = [];

      if (user.role?.id) {
        const rolePermissions = await this.userRepository.manager.query(
          `
          SELECT DISTINCT
            p.id,
            p.name,
            p.description,
            p.resource,
            p.action,
            'role' as source
          FROM permissions p
          INNER JOIN role_permissions rp ON p.id = rp.permission_id
          WHERE rp.role_id = $1
          ORDER BY p.resource, p.action
          `,
          [user.role.id],
        );

        const userPermissions = await this.userRepository.manager.query(
          `
          SELECT DISTINCT
            p.id,
            p.name,
            p.description,
            p.resource,
            p.action,
            'direct' as source
          FROM permissions p
          INNER JOIN user_permissions up ON p.id = up.permission_id
          WHERE up.user_id = $1
          ORDER BY p.resource, p.action
          `,
          [validId],
        );

        const permissionMap = new Map();

        rolePermissions.forEach((perm) => {
          permissionMap.set(perm.id, perm);
        });

        userPermissions.forEach((perm) => {
          if (!permissionMap.has(perm.id)) {
            permissionMap.set(perm.id, perm);
          }
        });

        allPermissions = Array.from(permissionMap.values()).sort((a, b) =>
          `${a.resource}_${a.action}`.localeCompare(
            `${b.resource}_${b.action}`,
          ),
        );
      } else {
        allPermissions = await this.userRepository.manager.query(
          `
          SELECT DISTINCT
            p.id,
            p.name,
            p.description,
            p.resource,
            p.action,
            'direct' as source
          FROM permissions p
          INNER JOIN user_permissions up ON p.id = up.permission_id
          WHERE up.user_id = $1
          ORDER BY p.resource, p.action
          `,
          [validId],
        );
      }

      user.permissions = allPermissions || [];

      return user;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error('Error in findOneWithPermissions:', error);
      throw new Error(`Failed to find user with permissions: ${error.message}`);
    }
  }

  async findById(
    id: string,
    relations: string[] = ['role'],
  ): Promise<User | null> {
    try {
      const validId = SecurityUtil.validateId(id);
      return this.usersRepository.findById(validId, relations);
    } catch (error) {
      throw new Error(`Failed to find user by ID: ${error.message}`);
    }
  }

  async getUserPermissions(
    userId: string,
  ): Promise<ServiceResponse<Permission[]>> {
    try {
      const validUserId = SecurityUtil.validateId(userId);

      const user = await this.userRepository
        .createQueryBuilder('user')
        .leftJoinAndSelect('user.role', 'role')
        .where('user.id = :id', { id: validUserId })
        .getOne();

      if (!user) {
        throw new NotFoundException('User not found');
      }

      const allPermissions = new Map<string, Permission>();

      if (user.role?.id) {
        const rolePermissions = await this.permissionRepository
          .createQueryBuilder('permission')
          .innerJoin('permission.rolePermissions', 'rp')
          .where('rp.roleId = :roleId', { roleId: user.role.id })
          .getMany();

        rolePermissions.forEach((permission) => {
          allPermissions.set(permission.id, permission);
        });
      }

      const userPermissions = await this.permissionRepository
        .createQueryBuilder('permission')
        .innerJoin('permission.userPermissions', 'up')
        .where('up.userId = :userId', { userId: validUserId })
        .getMany();

      userPermissions.forEach((permission) => {
        allPermissions.set(permission.id, permission);
      });

      const permissions = Array.from(allPermissions.values()).sort((a, b) =>
        `${a.resource}_${a.action}`.localeCompare(`${b.resource}_${b.action}`),
      );

      return {
        success: true,
        message: 'User permissions retrieved successfully',
        data: permissions,
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new Error(`Failed to retrieve user permissions: ${error.message}`);
    }
  }

  async findAll(
    filters: {
      search?: string;
      roleId?: string;
      departmentId?: string;
    } = {},
  ): Promise<ServiceResponse<User[]>> {
    try {
      const query = this.userRepository
        .createQueryBuilder('user')
        .leftJoinAndSelect('user.role', 'role')
        .leftJoinAndSelect('user.department', 'department')
        .select([
          'user.id',
          'user.email',
          'user.fullName',
          'user.phone',
          'user.roleId',
          'user.departmentId',
          'user.isActive',
          'user.createdAt',
          'user.updatedAt',
          'user.deletedAt',
          'role.id',
          'role.name',
          'role.description',
          'department.id',
          'department.name',
          'department.type',
        ]);

      const search = filters.search?.trim();
      if (search) {
        query.andWhere(
          '(user.full_name ILIKE :search OR user.email ILIKE :search)',
          { search: `%${search}%` },
        );
      }
      if (filters.roleId) {
        query.andWhere('user.role_id = :roleId', { roleId: filters.roleId });
      }
      if (filters.departmentId) {
        query.andWhere('user.department_id = :departmentId', {
          departmentId: filters.departmentId,
        });
      }

      const users = await query.orderBy('user.createdAt', 'DESC').getMany();

      return {
        success: true,
        message: 'Users retrieved successfully',
        data: users,
      };
    } catch (error) {
      throw new Error(`Failed to retrieve users: ${error.message}`);
    }
  }

  async getAssignableRoles(): Promise<ServiceResponse<Role[]>> {
    const roles = await this.roleRepository.find({
      order: { name: 'ASC' },
    });
    return {
      success: true,
      message: 'Assignable roles retrieved successfully',
      data: roles,
    };
  }

  async findOne(id: string): Promise<ServiceResponse<User>> {
    const user = await this.findOneWithPermissions(id);
    return {
      success: true,
      message: 'User retrieved successfully',
      data: user,
    };
  }

  async update(id: string, dto: UpdateUserDto): Promise<ServiceResponse<User>> {
    try {
      const validId = SecurityUtil.validateId(id);
      SecurityUtil.validateObject(dto);

      const user = await this.userRepository.findOne({
        where: { id: validId },
      });
      if (!user) {
        throw new NotFoundException('User not found');
      }

      if (dto.email && dto.email !== user.email) {
        const existingUser = await this.userRepository.findOne({
          where: { email: dto.email },
        });
        if (existingUser) {
          throw new ConflictException('Email already exists');
        }
      }

      if (dto.fullName) {
        await this.ensureUniqueFullName(dto.fullName, validId);
      }

      let role: Role | undefined;
      if (dto.roleId) {
        const validRoleId = SecurityUtil.validateId(dto.roleId);
        role = await this.roleRepository.findOne({
          where: { id: validRoleId },
        });
        if (!role) {
          throw new NotFoundException('Role not found');
        }
      }

      const updateData: any = { ...dto };
      if (dto.password) {
        updateData.passwordHash = await bcrypt.hash(dto.password, 10);
      }
      // `password` is a DTO-only field and must never be sent to TypeORM.
      delete updateData.password;
      if (role) {
        updateData.roleId = role.id;
        const roleName = role.name.toLowerCase();
        if (roleName === RoleEnum.DEPARTMENT_STAFF || roleName === 'driver') {
          if (!dto.departmentId && !user.departmentId) {
            throw new BadRequestException(
              'Department is required for department staff users',
            );
          }
        } else if (
          roleName === RoleEnum.OWNER ||
          roleName === RoleEnum.ACCOUNTANT
        ) {
          updateData.departmentId = null;
        }
      }

      await this.usersRepository.updateUser(
        validId,
        updateData as Partial<User> & UpdateUserDto,
      );

      const updatedUser = await this.findOneWithPermissions(validId);
      return {
        success: true,
        message: 'User updated successfully',
        data: updatedUser,
      };
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof ConflictException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      throw new Error(`Failed to update user: ${error.message}`);
    }
  }

  async remove(id: string): Promise<ServiceResponse<null>> {
    try {
      const validId = SecurityUtil.validateId(id);

      const user = await this.userRepository.findOne({
        where: { id: validId },
      });
      if (!user) {
        throw new NotFoundException('User not found');
      }

      await this.userRepository.update(validId, { isActive: false });
      return {
        success: true,
        message: 'User deactivated successfully',
        data: null,
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new Error(`Failed to delete user: ${error.message}`);
    }
  }

  async activate(id: string): Promise<ServiceResponse<User>> {
    try {
      const validId = SecurityUtil.validateId(id);
      const user = await this.userRepository.findOne({
        where: { id: validId },
      });
      if (!user) {
        throw new NotFoundException('User not found');
      }

      if (!user.isActive) {
        await this.userRepository.update(validId, { isActive: true });
      }
      return {
        success: true,
        message: 'User activated successfully',
        data: await this.findOneWithPermissions(validId),
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new Error(`Failed to activate user: ${error.message}`);
    }
  }

  private async ensureUniqueFullName(
    fullName: string,
    excludedUserId?: string,
  ): Promise<void> {
    const query = this.userRepository
      .createQueryBuilder('user')
      .where('LOWER(TRIM(user.fullName)) = LOWER(TRIM(:fullName))', {
        fullName,
      });
    if (excludedUserId) {
      query.andWhere('user.id <> :excludedUserId', { excludedUserId });
    }
    if (await query.getExists()) {
      throw new ConflictException('A user with this full name already exists');
    }
  }

  async findByDepartment(
    departmentId: string,
  ): Promise<ServiceResponse<User[]>> {
    try {
      const validDepartmentId = SecurityUtil.validateId(departmentId);

      const users = await this.userRepository.find({
        where: { departmentId: validDepartmentId, deletedAt: null as any },
        relations: ['department', 'role'],
        order: { fullName: 'ASC' },
      });

      return {
        success: true,
        message: 'Users retrieved successfully',
        data: users,
      };
    } catch (error) {
      throw new Error(`Failed to find users by department: ${error.message}`);
    }
  }

  async findEmployees(departmentId?: string): Promise<ServiceResponse<User[]>> {
    try {
      const query = this.userRepository
        .createQueryBuilder('user')
        .leftJoinAndSelect('user.role', 'role')
        .leftJoinAndSelect('user.department', 'department')
        .where('UPPER(role.name) = :roleName', { roleName: 'EMPLOYEE' })
        .andWhere('user.isActive = true')
        .andWhere('user.deletedAt IS NULL');

      if (departmentId) {
        const validDepartmentId = SecurityUtil.validateId(departmentId);
        query.andWhere('user.departmentId = :departmentId', {
          departmentId: validDepartmentId,
        });
      }

      const employees = await query.orderBy('user.fullName', 'ASC').getMany();

      return {
        success: true,
        message: 'Employees retrieved successfully',
        data: employees,
      };
    } catch (error) {
      throw new Error(`Failed to find employees: ${error.message}`);
    }
  }

  async findWorkers(departmentId?: string): Promise<ServiceResponse<User[]>> {
    try {
      const query = this.userRepository
        .createQueryBuilder('user')
        .leftJoinAndSelect('user.role', 'role')
        .leftJoinAndSelect('user.department', 'department')
        .where('role.name = :roleName', { roleName: 'WORKER' })
        .andWhere('user.deletedAt IS NULL');

      if (departmentId) {
        const validDepartmentId = SecurityUtil.validateId(departmentId);
        query.andWhere('user.departmentId = :departmentId', {
          departmentId: validDepartmentId,
        });
      }

      const workers = await query.orderBy('user.fullName', 'ASC').getMany();

      return {
        success: true,
        message: 'Workers retrieved successfully',
        data: workers,
      };
    } catch (error) {
      throw new Error(`Failed to find workers: ${error.message}`);
    }
  }

  async findDrivers(departmentId?: string): Promise<ServiceResponse<User[]>> {
    try {
      const query = this.userRepository
        .createQueryBuilder('user')
        .leftJoinAndSelect('user.role', 'role')
        .leftJoinAndSelect('user.department', 'department')
        .where('UPPER(role.name) = :roleName', { roleName: 'DRIVER' })
        .andWhere('user.isActive = true')
        .andWhere('user.deletedAt IS NULL');

      if (departmentId) {
        const validDepartmentId = SecurityUtil.validateId(departmentId);
        query.andWhere('user.departmentId = :departmentId', {
          departmentId: validDepartmentId,
        });
      }

      const drivers = await query.orderBy('user.fullName', 'ASC').getMany();

      return {
        success: true,
        message: 'Drivers retrieved successfully',
        data: drivers,
      };
    } catch (error) {
      throw new Error(`Failed to find drivers: ${error.message}`);
    }
  }

  async findPartyUsers(): Promise<ServiceResponse<User[]>> {
    const partyRoles = [...PARTY_USER_ROLE_NAMES];
    const users = await this.userRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.role', 'role')
      .leftJoinAndSelect('user.department', 'department')
      .where('UPPER(role.name) IN (:...partyRoles)', { partyRoles })
      .andWhere('user.isActive = true')
      .andWhere('user.deletedAt IS NULL')
      .orderBy('user.fullName', 'ASC')
      .getMany();
    return {
      success: true,
      message: 'Party users retrieved successfully',
      data: users,
    };
  }

  async assignDepartment(
    userId: string,
    departmentId: string,
  ): Promise<ServiceResponse<User>> {
    try {
      const validUserId = SecurityUtil.validateId(userId);
      const validDepartmentId = SecurityUtil.validateId(departmentId);

      const user = await this.userRepository.findOne({
        where: { id: validUserId },
      });
      if (!user) {
        throw new NotFoundException('User not found');
      }

      user.departmentId = validDepartmentId;
      await this.userRepository.save(user);

      const updatedUser = await this.findOneWithPermissions(validUserId);
      return {
        success: true,
        message: 'Department assigned successfully',
        data: updatedUser,
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new Error(`Failed to assign department: ${error.message}`);
    }
  }

  async updateSalary(
    _userId: string,
    _salary: number,
  ): Promise<ServiceResponse<User>> {
    throw new Error('Salary updates are managed through the salary module.');
  }

  async updateDailyWage(
    _userId: string,
    _wage: number,
  ): Promise<ServiceResponse<User>> {
    throw new Error(
      'Daily wage updates are managed through the salary module.',
    );
  }

  async recordResignation(
    _userId: string,
    _resignationDate: Date,
  ): Promise<ServiceResponse<User>> {
    throw new Error(
      'Resignation tracking is managed through the personnel module.',
    );
  }

  async getSalaryDetails(_userId: string): Promise<ServiceResponse<any>> {
    throw new Error(
      'Salary details are provided by the salary management module.',
    );
  }
}
