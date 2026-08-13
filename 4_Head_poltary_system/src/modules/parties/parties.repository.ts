import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Party } from './entities/party.entity';
import {
  IPartiesRepository,
  PaginatedResult,
} from './interfaces/parties-repository.interface';

@Injectable()
export class PartiesRepository implements IPartiesRepository {
  constructor(
    @InjectRepository(Party)
    private readonly partyRepository: Repository<Party>,
  ) {}

  async findAll(filters?: {
    type?: string;
    departmentId?: string;
    page?: number;
    limit?: number;
    search?: string;
  }): Promise<PaginatedResult<Party>> {
    const page = filters?.page ?? 1;
    const limit = filters?.limit ?? 20;
    const skip = (page - 1) * limit;

    const query = this.partyRepository
      .createQueryBuilder('party')
      .leftJoinAndSelect('party.user', 'user')
      .leftJoinAndSelect('party.departments', 'departments')
      .leftJoinAndSelect('party.primaryDepartment', 'primaryDepartment')
      .leftJoinAndSelect('party.linkedDepartment', 'linkedDepartment')
      .distinct(true);

    if (filters?.type) {
      query.andWhere('party.partyType = :type', { type: filters.type });
    }

    if (filters?.departmentId) {
      query.leftJoin('party.departments', 'departmentFilter');
      query.andWhere(
        '(departmentFilter.id = :departmentId OR party.primaryDepartmentId = :departmentId OR party.linkedDepartmentId = :departmentId)',
        { departmentId: filters.departmentId },
      );
    }

    if (filters?.search?.trim()) {
      query.andWhere('party.name ILIKE :search', {
        search: `%${filters.search.trim()}%`,
      });
    }

    const [items, total] = await query
      .orderBy('party.createdAt', 'DESC')
      .addOrderBy('party.id', 'DESC')
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    const totalPages = Math.ceil(total / limit);

    return {
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    };
  }

  async findById(id: string): Promise<Party | null> {
    return this.partyRepository.findOne({
      where: { id },
      relations: [
        'user',
        'departments',
        'primaryDepartment',
        'linkedDepartment',
      ],
    });
  }

  async create(party: Partial<Party>): Promise<Party> {
    const entity = this.partyRepository.create(party as Party);
    return this.partyRepository.save(entity);
  }

  async update(id: string, changes: Partial<Party>): Promise<Party> {
    await this.partyRepository.update({ id }, changes as Partial<Party>);
    return this.findById(id);
  }
}
