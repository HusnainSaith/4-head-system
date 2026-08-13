import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { IUsersRepository } from './interfaces/users-repository.interface';
import { Role } from '../roles/entities/role.entity';
import { Permission } from '../permissions/entities/permission.entity';
import { UserPermission } from './entities/user-permission.entity';

@Injectable()
export class UsersRepository implements IUsersRepository {
  constructor(
    @InjectRepository(User)
    public readonly userRepository: Repository<User>,
    @InjectRepository(Role)
    public readonly roleRepository: Repository<Role>,
    @InjectRepository(Permission)
    public readonly permissionRepository: Repository<Permission>,
    @InjectRepository(UserPermission)
    public readonly userPermissionRepository: Repository<UserPermission>,
  ) {}

  get manager() {
    return this.userRepository.manager;
  }

  createQueryBuilder(alias: string) {
    return this.userRepository.createQueryBuilder(alias);
  }

  async createUser(dto: Partial<User> & CreateUserDto): Promise<User> {
    const user = this.userRepository.create(dto as Partial<User>);
    return this.userRepository.save(user);
  }

  async findByEmail(
    email: string,
    includePassword = false,
    relations: string[] = [],
  ): Promise<User | null> {
    const query = this.userRepository
      .createQueryBuilder('user')
      .where('user.email = :email', { email });

    if (includePassword) {
      query.addSelect('user.passwordHash');
    }

    for (const relation of relations) {
      query.leftJoinAndSelect(`user.${relation}`, relation);
    }

    return query.getOne();
  }

  async findById(id: string, relations: string[] = []): Promise<User | null> {
    const query = this.userRepository
      .createQueryBuilder('user')
      .where('user.id = :id', { id });

    for (const relation of relations) {
      query.leftJoinAndSelect(`user.${relation}`, relation);
    }

    return query.getOne();
  }

  async updateUser(id: string, dto: Partial<User>): Promise<User> {
    await this.userRepository.update({ id }, dto as Partial<User>);
    return this.findById(id);
  }
}
