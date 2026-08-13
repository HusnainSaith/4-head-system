import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Employee } from './entities/employee.entity';
import { EmployeeAdvance } from './entities/employee-advance.entity';
import { EmployeeBonus } from './entities/employee-bonus.entity';
import { SalaryRun } from './entities/salary-run.entity';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';

@Injectable()
export class EmployeesRepository {
  constructor(
    @InjectRepository(Employee)
    private readonly repo: Repository<Employee>,
    @InjectRepository(EmployeeAdvance)
    private readonly advanceRepo: Repository<EmployeeAdvance>,
    @InjectRepository(EmployeeBonus)
    private readonly bonusRepo: Repository<EmployeeBonus>,
    @InjectRepository(SalaryRun)
    private readonly salaryRunRepo: Repository<SalaryRun>,
  ) {}

  createEmployee(dto: CreateEmployeeDto): Employee {
    return this.repo.create({
      ...dto,
      baseSalary: dto.baseSalary.toFixed(2),
      joiningDate: new Date(dto.joiningDate),
      isActive: true,
    } as Partial<Employee>) as Employee;
  }

  async saveEmployee(employee: Employee): Promise<Employee> {
    return this.repo.save(employee);
  }

  async findByDepartment(departmentId: string): Promise<Employee[]> {
    const query = this.repo
      .createQueryBuilder('employee')
      .withDeleted()
      .leftJoinAndSelect('employee.department', 'department')
      .leftJoinAndSelect('employee.user', 'user')
      .orderBy('employee.fullName', 'ASC');
    if (departmentId)
      query.where('employee.department_id = :departmentId', { departmentId });
    return query.getMany();
  }

  async findEmployeeById(id: string): Promise<Employee | null> {
    return this.repo.findOne({
      where: { id, deletedAt: null } as any,
      relations: ['department', 'user'],
    });
  }

  async findEmployeeByUserId(userId: string): Promise<Employee | null> {
    return this.repo
      .createQueryBuilder('employee')
      .withDeleted()
      .where('employee.user_id = :userId', { userId })
      .getOne();
  }

  async findEmployeeByIdIncludingInactive(
    id: string,
  ): Promise<Employee | null> {
    return this.repo
      .createQueryBuilder('employee')
      .withDeleted()
      .leftJoinAndSelect('employee.department', 'department')
      .leftJoinAndSelect('employee.user', 'user')
      .where('employee.id = :id', { id })
      .getOne();
  }

  async activate(id: string): Promise<void> {
    await this.repo.restore(id);
    await this.repo.update(id, { isActive: true });
  }

  async deactivate(id: string): Promise<void> {
    await this.repo.update(id, { isActive: false });
  }

  async findOutstandingAdvances(
    employeeId: string,
  ): Promise<EmployeeAdvance[]> {
    return this.advanceRepo.find({
      where: { employeeId, deletedAt: null },
      order: { advanceDate: 'ASC' },
    });
  }

  async findRecoverableAdvances(
    employeeId: string,
  ): Promise<EmployeeAdvance[]> {
    return this.advanceRepo.find({
      where: {
        employeeId,
        disbursementStatus: 'confirmed',
        deletedAt: null,
      },
      order: { advanceDate: 'ASC' },
    });
  }

  async findAdvance(
    id: string,
    employeeId: string,
  ): Promise<EmployeeAdvance | null> {
    return this.advanceRepo.findOne({
      where: { id, employeeId, deletedAt: null },
      relations: ['employee'],
    });
  }

  async findBonusesForPeriod(
    employeeId: string,
    periodMonth: number,
    periodYear: number,
  ): Promise<EmployeeBonus[]> {
    return this.bonusRepo
      .createQueryBuilder('bonus')
      .where('bonus.employee_id = :employeeId', { employeeId })
      .andWhere('EXTRACT(MONTH FROM bonus.bonus_date) = :periodMonth', {
        periodMonth,
      })
      .andWhere('EXTRACT(YEAR FROM bonus.bonus_date) = :periodYear', {
        periodYear,
      })
      .orderBy('bonus.bonus_date', 'ASC')
      .getMany();
  }

  async findAllBonuses(employeeId: string): Promise<EmployeeBonus[]> {
    return this.bonusRepo.find({
      where: { employeeId, deletedAt: null },
      order: { bonusDate: 'ASC' },
    });
  }

  async findSalaryRunById(id: string): Promise<SalaryRun | null> {
    return this.salaryRunRepo.findOne({
      where: { id },
      relations: ['employee', 'employee.department'],
    });
  }

  async findSalaryRun(
    employeeId: string,
    periodMonth: number,
    periodYear: number,
  ): Promise<SalaryRun | null> {
    return this.salaryRunRepo.findOne({
      where: { employeeId, periodMonth, periodYear },
      relations: ['employee'],
    });
  }

  async findSalaryRuns(
    departmentId?: string,
    periodMonth?: number,
    periodYear?: number,
  ): Promise<SalaryRun[]> {
    const qb = this.salaryRunRepo
      .createQueryBuilder('run')
      .leftJoinAndSelect('run.employee', 'employee');
    if (departmentId) {
      qb.andWhere('employee.department_id = :departmentId', { departmentId });
    }
    if (periodMonth != null) {
      qb.andWhere('run.period_month = :periodMonth', { periodMonth });
    }
    if (periodYear != null) {
      qb.andWhere('run.period_year = :periodYear', { periodYear });
    }
    return qb
      .orderBy('run.period_year', 'DESC')
      .addOrderBy('run.period_month', 'DESC')
      .getMany();
  }

  async saveAdvance(advance: EmployeeAdvance): Promise<EmployeeAdvance> {
    return this.advanceRepo.save(advance);
  }

  async saveBonus(bonus: EmployeeBonus): Promise<EmployeeBonus> {
    return this.bonusRepo.save(bonus);
  }

  async saveSalaryRun(salaryRun: SalaryRun): Promise<SalaryRun> {
    return this.salaryRunRepo.save(salaryRun);
  }

  async updateAdvance(advance: EmployeeAdvance): Promise<EmployeeAdvance> {
    return this.advanceRepo.save(advance);
  }

  async findAll(departmentId?: string): Promise<Employee[]> {
    const where: any = { deletedAt: null };
    if (departmentId) where.departmentId = departmentId;
    return this.repo.find({
      where,
      relations: ['department', 'user'],
      order: { fullName: 'ASC' },
    });
  }

  async findOne(id: string): Promise<Employee | null> {
    return this.findEmployeeById(id);
  }

  async update(id: string, dto: UpdateEmployeeDto): Promise<Employee> {
    await this.repo.update({ id }, {
      ...dto,
      baseSalary: dto.baseSalary?.toFixed(2),
      joiningDate: dto.joiningDate ? new Date(dto.joiningDate) : undefined,
    } as any);
    return this.findEmployeeById(id) as Promise<Employee>;
  }

  async softDelete(id: string): Promise<void> {
    await this.repo.update({ id }, {
      isActive: false,
      deletedAt: new Date(),
    } as any);
  }
}
