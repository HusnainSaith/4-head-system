import { Department } from '../entities/department.entity';

export interface IDepartmentsRepository {
  findAll(): Promise<Department[]>;
  findById(id: string): Promise<Department | null>;
  findByType(type: Department['type']): Promise<Department | null>;
  create(department: Partial<Department>): Promise<Department>;
}
