import { Employee } from '../entities/employee.entity';
import { EmployeeAdvance } from '../entities/employee-advance.entity';
import { EmployeeBonus } from '../entities/employee-bonus.entity';
import { SalaryRun } from '../entities/salary-run.entity';

export interface IEmployeesRepository {
  saveEmployee(employee: Employee): Promise<Employee>;
  findEmployeeById(id: string): Promise<Employee | null>;
  findByDepartment(departmentId: string): Promise<Employee[]>;
  findOutstandingAdvances(employeeId: string): Promise<EmployeeAdvance[]>;
  findBonusesForPeriod(
    employeeId: string,
    periodMonth: number,
    periodYear: number,
  ): Promise<EmployeeBonus[]>;
  findSalaryRun(
    employeeId: string,
    periodMonth: number,
    periodYear: number,
  ): Promise<SalaryRun | null>;
  findSalaryRuns(
    departmentId?: string,
    periodMonth?: number,
    periodYear?: number,
  ): Promise<SalaryRun[]>;
  saveAdvance(advance: EmployeeAdvance): Promise<EmployeeAdvance>;
  saveBonus(bonus: EmployeeBonus): Promise<EmployeeBonus>;
  saveSalaryRun(salaryRun: SalaryRun): Promise<SalaryRun>;
  updateAdvance(advance: EmployeeAdvance): Promise<EmployeeAdvance>;
}
