import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Department } from './entities/department.entity';
import { IDepartmentsRepository } from './interfaces/departments-repository.interface';

@Injectable()
export class DepartmentsRepository implements IDepartmentsRepository {
  constructor(
    @InjectRepository(Department)
    private readonly departmentRepository: Repository<Department>,
  ) {}

  findAll(): Promise<Department[]> {
    return this.departmentRepository.find();
  }

  findById(id: string): Promise<Department | null> {
    return this.departmentRepository.findOne({ where: { id } });
  }

  findByType(type: Department['type']): Promise<Department | null> {
    return this.departmentRepository.findOne({ where: { type } });
  }

  create(department: Partial<Department>): Promise<Department> {
    return this.departmentRepository.save(
      this.departmentRepository.create(department),
    );
  }
}
