import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { Role } from './entities/role.entity';

@Injectable()
export class RolesService {
  private readonly protectedRoles = new Set([
    'owner',
    'accountant',
    'department_staff',
  ]);
  constructor(
    @InjectRepository(Role) private readonly roles: Repository<Role>,
    @InjectRepository(User) private readonly users: Repository<User>,
  ) {}

  async findAll() {
    return {
      success: true,
      message: 'Roles retrieved successfully',
      data: await this.roles.find({ order: { name: 'ASC' } }),
    };
  }

  async create(dto: CreateRoleDto, actorId?: string) {
    if (await this.roles.findOne({ where: { name: dto.name } }))
      throw new ConflictException('A role with this name already exists');
    const role = await this.roles.save(
      this.roles.create({ ...dto, createdBy: actorId, updatedBy: actorId }),
    );
    return { success: true, message: 'Role created successfully', data: role };
  }

  async update(id: string, dto: UpdateRoleDto, actorId?: string) {
    const role = await this.roles.findOne({ where: { id } });
    if (!role) throw new NotFoundException('Role not found');
    if (this.protectedRoles.has(role.name.toLowerCase()) && dto.name)
      throw new ConflictException(
        'Core application role names cannot be changed',
      );
    if (dto.name && dto.name !== role.name) {
      const duplicate = await this.roles.findOne({ where: { name: dto.name } });
      if (duplicate)
        throw new ConflictException('A role with this name already exists');
    }
    Object.assign(role, dto, { updatedBy: actorId });
    return {
      success: true,
      message: 'Role updated successfully',
      data: await this.roles.save(role),
    };
  }

  async remove(id: string) {
    const role = await this.roles.findOne({ where: { id } });
    if (!role) throw new NotFoundException('Role not found');
    if (this.protectedRoles.has(role.name.toLowerCase()))
      throw new ConflictException('Core application roles cannot be deleted');
    if (await this.users.exists({ where: { roleId: id, isActive: true } }))
      throw new ConflictException(
        'Reassign active users before deleting this role',
      );
    await this.roles.softDelete(id);
    return { success: true, message: 'Role deleted successfully', data: null };
  }
}
