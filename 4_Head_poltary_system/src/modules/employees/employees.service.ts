import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Logger,
  Optional,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { EmployeesRepository } from './employees.repository';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { CreateAdvanceDto } from './dto/create-advance.dto';
import { CreateBonusDto } from './dto/create-bonus.dto';
import { RunPayrollDto } from './dto/run-payroll.dto';
import { EmployeeAdvance } from './entities/employee-advance.entity';
import { EmployeeBonus } from './entities/employee-bonus.entity';
import { SalaryRun } from './entities/salary-run.entity';
import { LedgerService } from '../ledger/ledger.service';
import { InvoicesService } from '../invoices/invoices.service';
import { NotificationsService } from '../notifications/notifications.service';
import {
  publishBusinessDocument,
  publishBusinessNotification,
} from '../invoices/business-document.helper';
import { UsersService } from '../users/users.service';
import { Employee } from './entities/employee.entity';
import { SalaryWithdrawal } from './entities/salary-withdrawal.entity';
import { SalaryWithdrawalAllocation } from './entities/salary-withdrawal-allocation.entity';
import { CreateSalaryWithdrawalDto } from './dto/create-salary-withdrawal.dto';
import {
  paymentAccountLink,
  PaymentAccountSelectionDto,
} from '../accounts/dto/payment-account-selection.dto';

@Injectable()
export class EmployeesService {
  private readonly logger = new Logger(EmployeesService.name);
  constructor(
    private readonly employeesRepository: EmployeesRepository,
    private readonly dataSource: DataSource,
    private readonly ledgerService: LedgerService,
    @Optional() private readonly invoicesService?: InvoicesService,
    @Optional() private readonly notificationsService?: NotificationsService,
    @Optional() private readonly usersService?: UsersService,
  ) {}

  async create(dto: CreateEmployeeDto) {
    const normalized = await this.validateLinkedEmployeeUser(dto);
    const employee = this.employeesRepository.createEmployee(normalized);
    const saved = await this.employeesRepository.saveEmployee(employee);
    return {
      success: true,
      message: 'Employee created successfully',
      data: saved,
    };
  }

  async findAll(departmentId?: string) {
    const employees = await this.employeesRepository.findByDepartment(
      departmentId || '',
    );
    return {
      success: true,
      message: 'Employees retrieved successfully',
      data: employees,
    };
  }

  async findOne(id: string) {
    const employee =
      await this.employeesRepository.findEmployeeByIdIncludingInactive(id);
    if (!employee) throw new NotFoundException('Employee not found');
    return {
      success: true,
      message: 'Employee retrieved successfully',
      data: employee,
    };
  }

  async update(id: string, dto: UpdateEmployeeDto) {
    const existing = await this.employeesRepository.findEmployeeById(id);
    if (!existing) throw new NotFoundException('Employee not found');
    const normalized = dto.userId
      ? await this.validateLinkedEmployeeUser(dto as CreateEmployeeDto, id)
      : dto;
    const updated = await this.employeesRepository.update(id, normalized);
    return {
      success: true,
      message: 'Employee updated successfully',
      data: updated,
    };
  }

  async remove(id: string) {
    const employee = await this.employeesRepository.findEmployeeById(id);
    if (!employee) throw new NotFoundException('Employee not found');
    await this.employeesRepository.deactivate(id);
    await this.employeesRepository.softDelete(id);
    return {
      success: true,
      message: 'Employee deleted successfully',
    };
  }

  async activate(id: string) {
    const employee =
      await this.employeesRepository.findEmployeeByIdIncludingInactive(id);
    if (!employee) throw new NotFoundException('Employee not found');
    await this.employeesRepository.activate(id);
    return {
      success: true,
      message: 'Employee activated successfully',
      data: await this.employeesRepository.findEmployeeByIdIncludingInactive(
        id,
      ),
    };
  }

  async createAdvance(
    employeeId: string,
    dto: CreateAdvanceDto,
    createdBy?: string,
  ) {
    const employee =
      await this.employeesRepository.findEmployeeById(employeeId);
    if (!employee) throw new NotFoundException('Employee not found');
    const advance = new EmployeeAdvance();
    advance.employeeId = employeeId;
    advance.amount = dto.amount.toFixed(2);
    advance.advanceDate = new Date(dto.advanceDate);
    advance.reason = dto.reason;
    advance.recoveryStatus = 'outstanding';
    advance.amountRecovered = '0';
    advance.disbursementStatus = 'pending';
    advance.createdBy = createdBy;
    const saved = await this.employeesRepository.saveAdvance(advance);
    if (this.notificationsService && createdBy)
      await publishBusinessNotification(
        this.notificationsService,
        {
          type: 'payment',
          title: 'Employee Advance Issued',
          message: `Advance issued to ${employee.fullName}`,
          recipientUserId: createdBy,
          sourceType: 'employee_advance',
          sourceId: saved.id,
          context: {
            amount: saved.amount,
            date: String(saved.advanceDate),
            status: saved.recoveryStatus,
            referenceNumber: saved.id,
          },
        },
        this.logger,
      );
    return {
      success: true,
      message: 'Employee advance created successfully',
      data: saved,
    };
  }

  async confirmAdvance(
    employeeId: string,
    advanceId: string,
    paymentMethod: 'cash' | 'bank',
    updatedBy: string,
    accountSelection?: PaymentAccountSelectionDto,
  ) {
    return this.dataSource.transaction(async (manager) => {
      // Lock only the advance table. Loading the optional employee relation in
      // the same FOR UPDATE query creates an outer join, which PostgreSQL
      // correctly rejects as a lock target on its nullable side.
      const advance = await manager.findOne(EmployeeAdvance, {
        where: { id: advanceId, employeeId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!advance) throw new NotFoundException('Employee advance not found');
      const employee = await manager.findOne(Employee, {
        where: { id: employeeId },
      });
      if (!employee) throw new NotFoundException('Employee not found');
      if (advance.disbursementStatus === 'confirmed')
        throw new BadRequestException('Employee advance is already confirmed');
      if (!employee.departmentId)
        throw new BadRequestException('Employee department is required');

      advance.disbursementStatus = 'confirmed';
      advance.confirmedAt = new Date();
      advance.paymentMethod = paymentMethod;
      Object.assign(
        advance,
        paymentAccountLink({ paymentMethod, ...accountSelection }),
      );
      advance.updatedBy = updatedBy;
      const saved = await manager.save(EmployeeAdvance, advance);
      await this.ledgerService.post(
        [
          {
            departmentId: employee.departmentId,
            accountCode: 'employee_advance',
            entryType: 'debit',
            amount: saved.amount,
            entryDate: saved.confirmedAt,
            sourceType: 'advance',
            sourceId: saved.id,
            description: `Advance paid to ${employee.fullName}`,
            createdBy: updatedBy,
          },
          {
            departmentId: employee.departmentId,
            accountCode: paymentMethod === 'bank' ? 'bank' : 'cash',
            ...paymentAccountLink({ paymentMethod, ...accountSelection }),
            entryType: 'credit',
            amount: saved.amount,
            entryDate: saved.confirmedAt,
            sourceType: 'advance',
            sourceId: saved.id,
            description: `Advance paid to ${employee.fullName}`,
            createdBy: updatedBy,
          },
        ],
        manager,
      );
      return {
        success: true,
        message: 'Employee advance confirmed and paid successfully',
        data: saved,
      };
    });
  }

  async getAdvances(employeeId: string) {
    const employee =
      await this.employeesRepository.findEmployeeById(employeeId);
    if (!employee) throw new NotFoundException('Employee not found');
    const advances =
      await this.employeesRepository.findOutstandingAdvances(employeeId);
    return {
      success: true,
      message: 'Employee advances retrieved successfully',
      data: advances,
    };
  }

  async createBonus(
    employeeId: string,
    dto: CreateBonusDto,
    createdBy?: string,
  ) {
    const employee =
      await this.employeesRepository.findEmployeeById(employeeId);
    if (!employee) throw new NotFoundException('Employee not found');
    if (!employee.departmentId)
      throw new BadRequestException('Employee department is required');

    const bonus = new EmployeeBonus();
    bonus.employeeId = employeeId;
    bonus.amount = dto.amount.toFixed(2);
    bonus.bonusDate = new Date(dto.bonusDate);
    bonus.reason = dto.reason;
    bonus.createdBy = createdBy;
    const saved = await this.employeesRepository.saveBonus(bonus);

    if (this.notificationsService && createdBy)
      await publishBusinessNotification(
        this.notificationsService,
        {
          type: 'payment',
          title: 'Employee Bonus Issued',
          message: `Bonus issued to ${employee.fullName}`,
          recipientUserId: createdBy,
          sourceType: 'employee_bonus',
          sourceId: saved.id,
          context: {
            amount: saved.amount,
            date: String(saved.bonusDate),
            status: 'Recorded',
            referenceNumber: saved.id,
          },
        },
        this.logger,
      );
    return {
      success: true,
      message: 'Employee bonus created successfully',
      data: saved,
    };
  }

  async getBonuses(employeeId: string) {
    const employee =
      await this.employeesRepository.findEmployeeById(employeeId);
    if (!employee) throw new NotFoundException('Employee not found');
    if (!employee.departmentId)
      throw new BadRequestException('Employee department is required');
    const bonuses = await this.employeesRepository.findAllBonuses(employeeId);
    return {
      success: true,
      message: 'Employee bonuses retrieved successfully',
      data: bonuses,
    };
  }

  async runPayroll(dto: RunPayrollDto, createdBy: string): Promise<SalaryRun> {
    const existing = await this.employeesRepository.findSalaryRun(
      dto.employeeId,
      dto.periodMonth,
      dto.periodYear,
    );
    if (existing) {
      throw new ConflictException(
        `Salary run already exists for period ${dto.periodMonth}/${dto.periodYear}`,
      );
    }

    const employee = await this.employeesRepository.findEmployeeById(
      dto.employeeId,
    );
    if (!employee) throw new NotFoundException('Employee not found');

    const baseSalary = parseFloat(employee.baseSalary || '0');
    const bonuses = await this.employeesRepository.findBonusesForPeriod(
      dto.employeeId,
      dto.periodMonth,
      dto.periodYear,
    );
    const totalBonuses = bonuses.reduce(
      (sum, bonus) => sum + parseFloat(bonus.amount as any),
      0,
    );

    const advances = dto.recoverAdvances
      ? await this.employeesRepository.findRecoverableAdvances(dto.employeeId)
      : [];
    let remaining = baseSalary + totalBonuses;
    let totalAdvancesDeducted = 0;
    const advancesToSave: EmployeeAdvance[] = [];

    for (const advance of advances) {
      if (remaining <= 0) break;
      const advanceTotal = parseFloat(advance.amount as any);
      const recovered = parseFloat((advance.amountRecovered as any) || '0');
      const outstanding = advanceTotal - recovered;
      if (outstanding <= 0) continue;
      const toRecover = Math.min(remaining, outstanding);
      advance.amountRecovered = (recovered + toRecover).toFixed(2);
      totalAdvancesDeducted += toRecover;
      remaining -= toRecover;
      advance.recoveryStatus =
        toRecover === outstanding ? 'fully_recovered' : 'partially_recovered';
      advancesToSave.push(advance);
    }

    const netPayable = baseSalary + totalBonuses - totalAdvancesDeducted;

    const savedRun = await this.dataSource.transaction(async (manager) => {
      for (const advance of advancesToSave) {
        await manager.save(EmployeeAdvance, advance);
      }

      const salaryRun = manager.create(SalaryRun, {
        employeeId: dto.employeeId,
        periodMonth: dto.periodMonth,
        periodYear: dto.periodYear,
        baseSalary: baseSalary.toFixed(2),
        totalBonuses: totalBonuses.toFixed(2),
        totalAdvancesDeducted: totalAdvancesDeducted.toFixed(2),
        netPayable: netPayable.toFixed(2),
        amountPaid: '0.00',
        paymentStatus: netPayable === 0 ? 'paid' : 'pending',
        createdBy,
        updatedBy: createdBy,
      } as Partial<SalaryRun>);

      const saved = await manager.save(SalaryRun, salaryRun);
      const accrualDate = new Date(
        Date.UTC(dto.periodYear, dto.periodMonth - 1, 1),
      );
      await this.ledgerService.post(
        [
          {
            departmentId: employee.departmentId,
            accountCode: 'payroll_expense',
            entryType: 'debit',
            amount: (baseSalary + totalBonuses).toFixed(2),
            entryDate: accrualDate,
            sourceType: 'salary',
            sourceId: saved.id,
            description: `Payroll accrued for ${dto.periodMonth}/${dto.periodYear}`,
            createdBy,
          },
          ...(totalAdvancesDeducted > 0
            ? [
                {
                  departmentId: employee.departmentId,
                  accountCode: 'employee_advance',
                  entryType: 'credit' as const,
                  amount: totalAdvancesDeducted.toFixed(2),
                  entryDate: accrualDate,
                  sourceType: 'salary' as const,
                  sourceId: saved.id,
                  createdBy,
                },
              ]
            : []),
          ...(netPayable > 0
            ? [
                {
                  departmentId: employee.departmentId,
                  accountCode: 'employee_salary_payable',
                  entryType: 'credit' as const,
                  amount: netPayable.toFixed(2),
                  entryDate: accrualDate,
                  sourceType: 'salary' as const,
                  sourceId: saved.id,
                  createdBy,
                },
              ]
            : []),
        ],
        manager,
      );
      return saved;
    });
    if (
      this.invoicesService &&
      this.notificationsService &&
      employee.departmentId
    )
      await publishBusinessDocument(
        this.invoicesService,
        this.notificationsService,
        {
          invoiceType: 'salary',
          departmentId: employee.departmentId,
          sourceType: 'salary',
          sourceId: savedRun.id,
          partyName: employee.fullName,
          lineItems: [
            {
              description: 'Base Salary',
              qty: 1,
              unit: 'month',
              rate: baseSalary,
              amount: baseSalary,
            },
            {
              description: 'Bonuses',
              qty: 1,
              unit: 'total',
              rate: totalBonuses,
              amount: totalBonuses,
            },
            {
              description: 'Advance Deductions',
              qty: 1,
              unit: 'total',
              rate: -totalAdvancesDeducted,
              amount: -totalAdvancesDeducted,
            },
          ],
          subtotal: netPayable,
          totalAmount: netPayable,
          notes: `Payroll ${dto.periodMonth}/${dto.periodYear}`,
        },
        createdBy,
        {
          type: 'salary',
          title: 'Salary Run Created',
          message: `Payroll created for ${employee.fullName}`,
          context: {
            employeeName: employee.fullName,
            period: `${dto.periodMonth}/${dto.periodYear}`,
            amount: savedRun.netPayable,
            date: new Date().toISOString().slice(0, 10),
            status: savedRun.paymentStatus,
          },
        },
        this.logger,
      );
    return savedRun;
  }

  async markSalaryPaid(
    runId: string,
    paidDate: string,
    paymentMethod: 'cash' | 'bank',
    updatedBy: string,
    amount?: number,
    accountSelection?: PaymentAccountSelectionDto,
  ) {
    const run = await this.employeesRepository.findSalaryRunById(runId);
    if (!run) throw new NotFoundException('Salary run not found');
    await this.processSalaryWithdrawal(
      run.employeeId,
      { amount, withdrawalDate: paidDate, paymentMethod, ...accountSelection },
      updatedBy,
      runId,
    );
    return this.employeesRepository.findSalaryRunById(runId);
  }

  async getSalaryAccount(employeeId: string) {
    const employee =
      await this.employeesRepository.findEmployeeByIdIncludingInactive(
        employeeId,
      );
    if (!employee) throw new NotFoundException('Employee not found');
    const runs = await this.dataSource.getRepository(SalaryRun).find({
      where: { employeeId },
      order: { periodYear: 'ASC', periodMonth: 'ASC' },
    });
    const withdrawals = await this.dataSource
      .getRepository(SalaryWithdrawal)
      .find({
        where: { employeeId },
        relations: ['allocations', 'allocations.salaryRun'],
        order: { withdrawalDate: 'DESC', createdAt: 'DESC' },
      });
    const totalAccrued = runs.reduce(
      (sum, run) => sum + Number(run.netPayable),
      0,
    );
    const totalWithdrawn = runs.reduce(
      (sum, run) => sum + Number(run.amountPaid ?? 0),
      0,
    );
    return {
      success: true,
      message: 'Employee salary account retrieved successfully',
      data: {
        employeeId,
        totalAccrued: totalAccrued.toFixed(2),
        totalWithdrawn: totalWithdrawn.toFixed(2),
        availableBalance: (totalAccrued - totalWithdrawn).toFixed(2),
        runs,
        withdrawals,
      },
    };
  }

  async withdrawSalary(
    employeeId: string,
    dto: CreateSalaryWithdrawalDto,
    createdBy: string,
  ) {
    const data = await this.processSalaryWithdrawal(employeeId, dto, createdBy);
    return {
      success: true,
      message: 'Salary withdrawal recorded successfully',
      data,
    };
  }

  private async processSalaryWithdrawal(
    employeeId: string,
    dto: Omit<CreateSalaryWithdrawalDto, 'amount'> & { amount?: number },
    createdBy: string,
    targetRunId?: string,
  ) {
    return this.dataSource.transaction(async (manager) => {
      const employee = await manager.findOne(Employee, {
        where: { id: employeeId },
      });
      if (!employee) throw new NotFoundException('Employee not found');
      if (!employee.departmentId)
        throw new BadRequestException('Employee department is required');
      const query = manager
        .getRepository(SalaryRun)
        .createQueryBuilder('run')
        .setLock('pessimistic_write')
        .where('run.employee_id = :employeeId', { employeeId })
        .andWhere('run.amount_paid < run.net_payable');
      if (targetRunId) query.andWhere('run.id = :targetRunId', { targetRunId });
      const runs = await query
        .orderBy('run.period_year', 'ASC')
        .addOrderBy('run.period_month', 'ASC')
        .getMany();
      const available = runs.reduce(
        (sum, run) =>
          sum + Number(run.netPayable) - Number(run.amountPaid ?? 0),
        0,
      );
      if (available <= 0)
        throw new BadRequestException('No accrued salary is available');
      const requested = dto.amount ?? available;
      if (requested > available)
        throw new BadRequestException(
          `Withdrawal cannot exceed available salary balance ${available.toFixed(2)}`,
        );
      const repository = manager.getRepository(SalaryWithdrawal);
      const withdrawal = await repository.save(
        repository.create({
          employeeId,
          amount: requested.toFixed(2),
          withdrawalDate: new Date(dto.withdrawalDate),
          paymentMethod: dto.paymentMethod,
          ...paymentAccountLink(dto),
          notes: dto.notes,
          createdBy,
          updatedBy: createdBy,
        }),
      );
      let remaining = Math.round(requested * 100);
      const allocations: SalaryWithdrawalAllocation[] = [];
      for (const run of runs) {
        if (remaining === 0) break;
        const runRemaining = Math.round(
          (Number(run.netPayable) - Number(run.amountPaid ?? 0)) * 100,
        );
        const allocated = Math.min(remaining, runRemaining);
        const paid = Math.round(Number(run.amountPaid ?? 0) * 100) + allocated;
        run.amountPaid = (paid / 100).toFixed(2);
        run.paymentStatus =
          paid === Math.round(Number(run.netPayable) * 100)
            ? 'paid'
            : 'partially_paid';
        if (run.paymentStatus === 'paid') {
          run.paidDate = new Date(dto.withdrawalDate);
          run.paymentMethod = dto.paymentMethod;
        }
        allocations.push(
          manager.getRepository(SalaryWithdrawalAllocation).create({
            withdrawalId: withdrawal.id,
            salaryRunId: run.id,
            amount: (allocated / 100).toFixed(2),
            createdBy,
            updatedBy: createdBy,
          }),
        );
        remaining -= allocated;
      }
      await manager.save(SalaryRun, runs);
      await manager.save(SalaryWithdrawalAllocation, allocations);
      await this.ledgerService.post(
        [
          {
            departmentId: employee.departmentId,
            accountCode: 'employee_salary_payable',
            entryType: 'debit',
            amount: withdrawal.amount,
            entryDate: withdrawal.withdrawalDate,
            sourceType: 'salary_withdrawal',
            sourceId: withdrawal.id,
            createdBy,
          },
          {
            departmentId: employee.departmentId,
            accountCode: dto.paymentMethod === 'bank' ? 'bank' : 'cash',
            ...paymentAccountLink(dto),
            entryType: 'credit',
            amount: withdrawal.amount,
            entryDate: withdrawal.withdrawalDate,
            sourceType: 'salary_withdrawal',
            sourceId: withdrawal.id,
            createdBy,
          },
        ],
        manager,
      );
      return repository.findOneOrFail({
        where: { id: withdrawal.id },
        relations: ['allocations', 'allocations.salaryRun'],
      });
    });
  }

  async getSalaryRuns(
    departmentId?: string,
    periodMonth?: number,
    periodYear?: number,
  ) {
    const runs = await this.employeesRepository.findSalaryRuns(
      departmentId,
      periodMonth,
      periodYear,
    );
    return {
      success: true,
      message: 'Salary runs retrieved successfully',
      data: runs,
    };
  }

  async getSalaryRun(id: string) {
    const run = await this.employeesRepository.findSalaryRunById(id);
    if (!run) throw new NotFoundException('Salary run not found');
    const bonuses = await this.employeesRepository.findBonusesForPeriod(
      run.employeeId,
      run.periodMonth,
      run.periodYear,
    );
    return {
      success: true,
      message: 'Salary run retrieved successfully',
      data: { ...run, bonuses },
    };
  }

  private async validateLinkedEmployeeUser(
    dto: CreateEmployeeDto,
    currentEmployeeId?: string,
  ): Promise<CreateEmployeeDto> {
    if (!this.usersService)
      throw new BadRequestException('User service is unavailable');
    const user = await this.usersService.findById(dto.userId, [
      'role',
      'department',
    ]);
    if (!user || !user.isActive || user.deletedAt)
      throw new BadRequestException('Select an active employee user');
    if (user.role?.name?.toUpperCase() !== 'EMPLOYEE')
      throw new BadRequestException('Selected user must have EMPLOYEE role');
    if (!user.departmentId || user.departmentId !== dto.departmentId)
      throw new BadRequestException(
        'Employee user must belong to the selected department',
      );
    const existing = await this.employeesRepository.findEmployeeByUserId(
      dto.userId,
    );
    if (existing && existing.id !== currentEmployeeId)
      throw new ConflictException(
        'An employee record already exists for this user',
      );
    return {
      ...dto,
      fullName: user.fullName,
      phone: user.phone ?? undefined,
    };
  }
}
