import { Injectable, NotFoundException } from '@nestjs/common';
import { DepartmentsRepository } from './departments.repository';
import { Department } from './entities/department.entity';

@Injectable()
export class DepartmentsService {
  constructor(private readonly departmentsRepository: DepartmentsRepository) {}

  findAll(): Promise<Department[]> {
    return this.departmentsRepository.findAll();
  }

  async findById(id: string): Promise<Department> {
    const department = await this.departmentsRepository.findById(id);
    if (!department) {
      throw new NotFoundException('Department not found');
    }
    return department;
  }

  async findByType(type: Department['type']): Promise<Department> {
    const department = await this.departmentsRepository.findByType(type);
    if (!department) {
      throw new NotFoundException('Department not found');
    }
    return department;
  }
}
