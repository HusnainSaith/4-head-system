import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Logger,
  Optional,
} from '@nestjs/common';
import { centsToMoney, moneyToCents } from '../../common/utils/money.util';
import { DataSource, EntityManager, In } from 'typeorm';
import { salaryBalancesWithBonuses } from './salary-bonus-balance';
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

      await this.assertPaymentFunds(
        manager,
        paymentMethod,
        accountSelection ?? {},
        advance.amount,
      );
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

  private async assertPaymentFunds(
    manager: EntityManager,
    method: 'cash' | 'bank',
    selection: PaymentAccountSelectionDto,
    amount: string,
  ) {
    const link = paymentAccountLink({ paymentMethod: method, ...selection });
    const table = method === 'cash' ? 'cash_accounts' : 'bank_accounts';
    const column = method === 'cash' ? 'cash_account_id' : 'bank_account_id';
    const id = method === 'cash' ? link.cashAccountId : link.bankAccountId;
    const [account] = await manager.query(
      'SELECT opening_balance FROM ' +
        table +
        ' WHERE id = $1 AND is_active = true AND deleted_at IS NULL FOR UPDATE',
      [id],
    );
    if (!account)
      throw new BadRequestException('Selected payment account is unavailable');
    const [row] = await manager.query(
      "SELECT COALESCE(SUM(CASE WHEN entry_type = 'debit' THEN amount ELSE -amount END), 0)::text AS balance FROM ledger_entries WHERE " +
        column +
        " = $1 AND source_type <> 'opening_balance'",
      [id],
    );
    const available =
      moneyToCents(account.opening_balance) + moneyToCents(row.balance);
    if (moneyToCents(amount) > available)
      throw new BadRequestException(
        'Insufficient ' +
          method +
          ' balance. Available: ' +
          centsToMoney(available),
      );
  }

  async changeAdvance(
    employeeId: string,
    advanceId: string,
    dto: CreateAdvanceDto | null,
    updatedBy: string,
  ) {
    return this.dataSource.transaction(async (manager) => {
      const advance = await manager.findOne(EmployeeAdvance, {
        where: { id: advanceId, employeeId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!advance) throw new NotFoundException('Employee advance not found');
      if (
        moneyToCents(advance.amountRecovered || '0') > 0n ||
        advance.recoveryStatus !== 'outstanding'
      )
        throw new BadRequestException(
          'Advances recovered through payroll cannot be edited or deleted',
        );
      if (advance.disbursementStatus === 'confirmed') {
        const delta = dto
          ? moneyToCents(dto.amount.toFixed(2)) - moneyToCents(advance.amount)
          : -moneyToCents(advance.amount);
        if (delta !== 0n) {
          const employee = await manager.findOne(Employee, {
            where: { id: employeeId },
          });
          if (!employee?.departmentId)
            throw new BadRequestException('Employee department is required');
          if (delta > 0n)
            await this.assertPaymentFunds(
              manager,
              advance.paymentMethod!,
              advance,
              centsToMoney(delta),
            );
          const common = {
            departmentId: employee.departmentId,
            amount: centsToMoney(delta > 0n ? delta : -delta),
            entryDate: new Date(),
            sourceType: 'advance',
            sourceId: advance.id,
            description: dto
              ? 'Advance amount correction'
              : 'Advance deletion reversal',
            createdBy: updatedBy,
          };
          await this.ledgerService.post(
            [
              {
                ...common,
                accountCode: 'employee_advance',
                entryType: delta > 0n ? 'debit' : 'credit',
              },
              {
                ...common,
                accountCode: advance.paymentMethod === 'bank' ? 'bank' : 'cash',
                cashAccountId: advance.cashAccountId,
                bankAccountId: advance.bankAccountId,
                bankTransactionMethod: advance.bankTransactionMethod,
                chequeNumber: advance.chequeNumber,
                appReference: advance.appReference,
                entryType: delta > 0n ? 'credit' : 'debit',
              },
            ],
            manager,
          );
        }
      }
      if (!dto) {
        advance.updatedBy = updatedBy;
        await manager.save(EmployeeAdvance, advance);
        await manager.softRemove(EmployeeAdvance, advance);
        return {
          success: true,
          message: 'Employee advance deleted successfully',
        };
      }
      advance.amount = dto.amount.toFixed(2);
      advance.advanceDate = new Date(dto.advanceDate);
      advance.reason = dto.reason;
      advance.updatedBy = updatedBy;
      return {
        success: true,
        message: 'Employee advance updated successfully',
        data: await manager.save(EmployeeAdvance, advance),
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
    const saved = await this.dataSource.transaction(async (manager) => {
      const lockedEmployee = await manager.findOne(Employee, {
        where: { id: employeeId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!lockedEmployee) throw new NotFoundException('Employee not found');
      return manager.save(EmployeeBonus, bonus);
    });

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

  async changeBonus(
    employeeId: string,
    bonusId: string,
    dto: CreateBonusDto | null,
    updatedBy: string,
  ) {
    return this.dataSource.transaction(async (manager) => {
      const employee = await manager.findOne(Employee, {
        where: { id: employeeId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!employee) throw new NotFoundException('Employee not found');
      const bonus = await manager.findOne(EmployeeBonus, {
        where: { id: bonusId, employeeId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!bonus) throw new NotFoundException('Employee bonus not found');
      const dateKey = (date: Date | string) =>
        (date instanceof Date ? date.toISOString() : String(date)).slice(0, 7);
      const periods = new Set([
        dateKey(bonus.bonusDate),
        ...(dto ? [dateKey(dto.bonusDate)] : []),
      ]);
      const runs = await manager
        .getRepository(SalaryRun)
        .createQueryBuilder('run')
        .setLock('pessimistic_write')
        .where('run.employee_id = :employeeId', { employeeId })
        .orderBy('run.period_year', 'ASC')
        .addOrderBy('run.period_month', 'ASC')
        .getMany();
      const allBonuses = await manager.find(EmployeeBonus, {
        where: { employeeId },
      });
      const revisedBonuses = allBonuses.filter((item) => item.id !== bonus.id);
      if (dto)
        revisedBonuses.push({
          ...bonus,
          amount: dto.amount.toFixed(2),
          bonusDate: new Date(dto.bonusDate),
        });
      const corrections: { run: SalaryRun; total: bigint; net: bigint }[] = [];
      for (const run of runs) {
        const period = `${run.periodYear}-${String(run.periodMonth).padStart(2, '0')}`;
        if (!periods.has(period)) continue;
        const total = revisedBonuses
          .filter((item) => dateKey(item.bonusDate) === period)
          .reduce((sum, item) => sum + moneyToCents(item.amount), 0n);
        const net =
          moneyToCents(run.netPayable) + total - moneyToCents(run.totalBonuses);
        if (net < 0n || net < moneyToCents(run.amountPaid ?? '0'))
          throw new BadRequestException(
            'This bonus change would reduce salary below its deductions or amount already withdrawn. Correct the withdrawal first.',
          );
        corrections.push({ run, total, net });
      }
      // Validate every affected month before saving anything. Payroll and ledger
      // corrections commit atomically with the requested bonus change.
      for (const { run, total, net } of corrections) {
        const [row] = await manager.query(
          "SELECT COALESCE(SUM(CASE WHEN entry.entry_type = 'credit' THEN entry.amount ELSE -entry.amount END), 0)::text AS amount FROM ledger_entries entry JOIN chart_of_accounts account ON account.id = entry.account_id WHERE entry.source_type = 'salary' AND entry.source_id = $1 AND account.code = 'employee_salary_payable'",
          [run.id],
        );
        const delta = net - moneyToCents(row.amount);
        if (delta !== 0n) {
          if (!employee.departmentId)
            throw new BadRequestException('Employee department is required');
          const common = {
            departmentId: employee.departmentId,
            amount: centsToMoney(delta > 0n ? delta : -delta),
            entryDate: new Date(),
            sourceType: 'salary',
            sourceId: run.id,
            description: 'Bonus correction',
            createdBy: updatedBy,
          };
          await this.ledgerService.post(
            [
              {
                ...common,
                accountCode: 'payroll_expense',
                entryType: delta > 0n ? 'debit' : 'credit',
              },
              {
                ...common,
                accountCode: 'employee_salary_payable',
                entryType: delta > 0n ? 'credit' : 'debit',
              },
            ],
            manager,
          );
        }
        run.totalBonuses = centsToMoney(total);
        run.netPayable = centsToMoney(net);
        const paid = moneyToCents(run.amountPaid ?? '0');
        run.paymentStatus =
          paid === net ? 'paid' : paid > 0n ? 'partially_paid' : 'pending';
        if (paid < net) {
          run.paidDate = null;
          run.paymentMethod = null;
        }
        run.updatedBy = updatedBy;
        await manager.save(SalaryRun, run);
      }
      bonus.updatedBy = updatedBy;
      if (!dto) {
        await manager.save(EmployeeBonus, bonus);
        await manager.softRemove(EmployeeBonus, bonus);
        return {
          success: true,
          message: 'Employee bonus deleted successfully',
        };
      }
      bonus.amount = dto.amount.toFixed(2);
      bonus.bonusDate = new Date(dto.bonusDate);
      bonus.reason = dto.reason;
      return {
        success: true,
        message: 'Employee bonus updated successfully',
        data: await manager.save(EmployeeBonus, bonus),
      };
    });
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

    const baseSalaryCents = moneyToCents(employee.baseSalary || '0');
    const bonuses = await this.employeesRepository.findBonusesForPeriod(
      dto.employeeId,
      dto.periodMonth,
      dto.periodYear,
    );
    const bonusCents = bonuses.reduce(
      (sum, bonus) => sum + moneyToCents(bonus.amount),
      0n,
    );
    const grossCents = baseSalaryCents + bonusCents;
    const manualDeduction = dto.manualDeduction ?? 0;
    if (
      !Number.isFinite(manualDeduction) ||
      manualDeduction < 0 ||
      Math.abs(manualDeduction * 100 - Math.round(manualDeduction * 100)) >
        0.000001
    )
      throw new BadRequestException(
        'Deduction must be a non-negative amount with at most two decimal places',
      );
    const deductionCents = moneyToCents(manualDeduction.toFixed(2));
    if (deductionCents > grossCents)
      throw new BadRequestException(
        'Deduction cannot exceed salary plus bonuses',
      );
    const advances = dto.recoverAdvances
      ? await this.employeesRepository.findRecoverableAdvances(dto.employeeId)
      : [];
    let remaining = grossCents - deductionCents;
    let recoveredCents = 0n;
    const advancesToSave: EmployeeAdvance[] = [];
    const recoveryAllocations: { advanceId: string; amount: string }[] = [];
    for (const advance of advances) {
      if (remaining <= 0n) break;
      const recovered = moneyToCents(advance.amountRecovered || '0');
      const outstanding = moneyToCents(advance.amount) - recovered;
      if (outstanding <= 0n) continue;
      const toRecover = remaining < outstanding ? remaining : outstanding;
      advance.amountRecovered = centsToMoney(recovered + toRecover);
      recoveryAllocations.push({
        advanceId: advance.id,
        amount: centsToMoney(toRecover),
      });
      recoveredCents += toRecover;
      remaining -= toRecover;
      advance.recoveryStatus =
        toRecover === outstanding ? 'fully_recovered' : 'partially_recovered';
      advancesToSave.push(advance);
    }
    const baseSalary = Number(centsToMoney(baseSalaryCents));
    const totalBonuses = Number(centsToMoney(bonusCents));
    const totalAdvancesDeducted = Number(centsToMoney(recoveredCents));
    const netPayable = Number(centsToMoney(remaining));

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
        manualDeduction: manualDeduction.toFixed(2),
        deductionReason: dto.deductionReason?.trim() || undefined,
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
            amount: centsToMoney(grossCents - deductionCents),
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
                  description: JSON.stringify({
                    advanceRecoveries: recoveryAllocations,
                  }),
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
              description:
                'Leave charges / fine' +
                (dto.deductionReason ? ': ' + dto.deductionReason : ''),
              qty: 1,
              unit: 'total',
              rate: -manualDeduction,
              amount: -manualDeduction,
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

  async cancelPayroll(employeeId: string, runId: string, updatedBy: string) {
    return this.dataSource.transaction(async (manager) => {
      const employee = await manager.findOne(Employee, {
        where: { id: employeeId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!employee) throw new NotFoundException('Employee not found');
      const run = await manager.findOne(SalaryRun, {
        where: { id: runId, employeeId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!run)
        throw new NotFoundException('Payroll not found or already cancelled');
      if (moneyToCents(run.totalAdvancesDeducted) > 0n) {
        const payrollEntries = await this.ledgerService.findBySource(
          'salary',
          run.id,
          manager,
        );
        const recoveryEntry = payrollEntries.find(
          (entry) =>
            entry.account.code === 'employee_advance' &&
            entry.entryType === 'credit',
        );
        let recoveries: { advanceId: string; amount: string }[];
        try {
          recoveries = JSON.parse(
            recoveryEntry?.description || '{}',
          ).advanceRecoveries;
          if (
            !Array.isArray(recoveries) ||
            !recoveries.length ||
            recoveries.reduce(
              (sum, item) => sum + moneyToCents(item.amount),
              0n,
            ) !== moneyToCents(run.totalAdvancesDeducted)
          )
            throw new Error();
        } catch {
          throw new BadRequestException(
            'This older payroll has no itemized advance recovery record. Reconcile its recovered advances before cancellation.',
          );
        }
        for (const recovery of recoveries) {
          const advance = await manager.findOne(EmployeeAdvance, {
            where: { id: recovery.advanceId, employeeId },
            lock: { mode: 'pessimistic_write' },
          });
          if (!advance)
            throw new BadRequestException('Recovered advance is missing');
          const recovered =
            moneyToCents(advance.amountRecovered) -
            moneyToCents(recovery.amount);
          if (recovered < 0n)
            throw new BadRequestException(
              'Advance recovery requires reconciliation',
            );
          advance.amountRecovered = centsToMoney(recovered);
          advance.recoveryStatus =
            recovered === 0n
              ? 'outstanding'
              : recovered === moneyToCents(advance.amount)
                ? 'fully_recovered'
                : 'partially_recovered';
          advance.updatedBy = updatedBy;
          await manager.save(EmployeeAdvance, advance);
        }
      }
      const allocations = await manager.find(SalaryWithdrawalAllocation, {
        where: { salaryRunId: run.id },
        order: { withdrawalId: 'ASC' },
      });
      const allocated = allocations.reduce(
        (sum, item) => sum + moneyToCents(item.amount),
        0n,
      );
      if (allocated !== moneyToCents(run.amountPaid))
        throw new BadRequestException(
          'Salary payment allocations must be reconciled before cancellation',
        );
      for (const allocation of allocations) {
        const withdrawal = await manager.findOne(SalaryWithdrawal, {
          where: { id: allocation.withdrawalId, employeeId },
          lock: { mode: 'pessimistic_write' },
        });
        if (!withdrawal)
          throw new BadRequestException('Salary withdrawal is missing');
        const entries = await this.ledgerService.findBySource(
          'salary_withdrawal',
          withdrawal.id,
          manager,
        );
        const payment = entries.find(
          (entry) =>
            entry.entryType === 'credit' &&
            (entry.cashAccountId || entry.bankAccountId),
        );
        if (!payment)
          throw new BadRequestException('Original payment account is missing');
        const remaining =
          moneyToCents(withdrawal.amount) - moneyToCents(allocation.amount);
        if (remaining < 0n)
          throw new BadRequestException('Invalid salary withdrawal allocation');
        await this.ledgerService.post(
          [
            {
              departmentId: payment.departmentId,
              accountCode: payment.account.code,
              cashAccountId: payment.cashAccountId,
              bankAccountId: payment.bankAccountId,
              bankTransactionMethod: payment.bankTransactionMethod,
              chequeNumber: payment.chequeNumber,
              appReference: payment.appReference,
              entryType: 'debit',
              amount: allocation.amount,
              entryDate: new Date(),
              sourceType: 'salary_withdrawal',
              sourceId: withdrawal.id,
              description: 'Payroll cancellation refund',
              createdBy: updatedBy,
            },
            {
              departmentId: payment.departmentId,
              accountCode: 'employee_salary_payable',
              entryType: 'credit',
              amount: allocation.amount,
              entryDate: new Date(),
              sourceType: 'salary_withdrawal',
              sourceId: withdrawal.id,
              description: 'Payroll cancellation refund',
              createdBy: updatedBy,
            },
          ],
          manager,
        );
        if (remaining > 0n) withdrawal.amount = centsToMoney(remaining);
        withdrawal.updatedBy = updatedBy;
        await manager.save(SalaryWithdrawal, withdrawal);
        if (remaining === 0n)
          await manager.softRemove(SalaryWithdrawal, withdrawal);
        await manager.softRemove(SalaryWithdrawalAllocation, allocation);
      }
      await this.ledgerService.reverseSource(
        'salary',
        run.id,
        updatedBy,
        manager,
      );
      run.updatedBy = updatedBy;
      await manager.save(SalaryRun, run);
      await manager.softRemove(SalaryRun, run);
      return { success: true, message: 'Payroll cancelled successfully' };
    });
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
    const savedRuns = await this.dataSource.getRepository(SalaryRun).find({
      where: { employeeId },
      order: { periodYear: 'ASC', periodMonth: 'ASC' },
    });
    const runs = await this.projectSalaryBalances(savedRuns);
    const withdrawals = await this.dataSource
      .getRepository(SalaryWithdrawal)
      .find({
        where: { employeeId },
        relations: ['allocations', 'allocations.salaryRun'],
        order: { withdrawalDate: 'DESC', createdAt: 'DESC' },
      });
    type PaymentEntry = {
      source_id: string;
      cash_account_id?: string;
      bank_account_id?: string;
      bank_transaction_method?: 'cheque' | 'app';
      cheque_number?: string;
      app_reference?: string;
    };
    const paymentEntries: PaymentEntry[] = withdrawals.length
      ? await this.dataSource.query(
          "SELECT source_id, cash_account_id, bank_account_id, bank_transaction_method, cheque_number, app_reference FROM ledger_entries WHERE source_type = 'salary_withdrawal' AND source_id = ANY($1::uuid[]) AND entry_type = 'credit' AND (cash_account_id IS NOT NULL OR bank_account_id IS NOT NULL)",
          [withdrawals.map((item) => item.id)],
        )
      : [];
    const accountsByWithdrawal = new Map(
      paymentEntries.map((entry) => [entry.source_id, entry]),
    );
    const withdrawalHistory = withdrawals.map((item) => {
      const entry = accountsByWithdrawal.get(item.id);
      return {
        ...item,
        cashAccountId: entry?.cash_account_id,
        bankAccountId: entry?.bank_account_id,
        bankTransactionMethod: entry?.bank_transaction_method,
        chequeNumber: entry?.cheque_number,
        appReference: entry?.app_reference,
      };
    });
    const totalAccrued = runs.reduce(
      (sum, run) => sum + moneyToCents(run.netPayable),
      0n,
    );
    const totalWithdrawn = runs.reduce(
      (sum, run) => sum + moneyToCents(run.amountPaid ?? '0'),
      0n,
    );
    return {
      success: true,
      message: 'Employee salary account retrieved successfully',
      data: {
        employeeId,
        totalAccrued: centsToMoney(totalAccrued),
        totalWithdrawn: centsToMoney(totalWithdrawn),
        availableBalance: centsToMoney(totalAccrued - totalWithdrawn),
        runs,
        withdrawals: withdrawalHistory,
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

  async changeSalaryWithdrawal(
    employeeId: string,
    withdrawalId: string,
    dto: CreateSalaryWithdrawalDto | null,
    updatedBy: string,
  ) {
    return this.dataSource.transaction(async (manager) => {
      const employee = await manager.findOne(Employee, {
        where: { id: employeeId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!employee) throw new NotFoundException('Employee not found');
      const withdrawal = await manager.findOne(SalaryWithdrawal, {
        where: { id: withdrawalId, employeeId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!withdrawal)
        throw new NotFoundException('Salary withdrawal not found');
      const allocations = await manager.find(SalaryWithdrawalAllocation, {
        where: { withdrawalId },
        order: { salaryRunId: 'ASC' },
      });
      if (!allocations.length)
        throw new BadRequestException(
          'Withdrawal salary allocations are missing',
        );
      for (const allocation of allocations) {
        const run = await manager.findOne(SalaryRun, {
          where: { id: allocation.salaryRunId, employeeId },
          lock: { mode: 'pessimistic_write' },
        });
        if (!run)
          throw new BadRequestException('Allocated salary run is missing');
        const paid =
          moneyToCents(run.amountPaid) - moneyToCents(allocation.amount);
        if (paid < 0n)
          throw new BadRequestException(
            'Withdrawal allocations do not match salary payments',
          );
        run.amountPaid = centsToMoney(paid);
        run.paymentStatus = paid === 0n ? 'pending' : 'partially_paid';
        run.paidDate = null;
        run.paymentMethod = null;
        run.updatedBy = updatedBy;
        await manager.save(SalaryRun, run);
        allocation.updatedBy = updatedBy;
        await manager.save(SalaryWithdrawalAllocation, allocation);
        await manager.softRemove(SalaryWithdrawalAllocation, allocation);
      }
      await this.ledgerService.reverseSource(
        'salary_withdrawal',
        withdrawal.id,
        updatedBy,
        manager,
      );
      withdrawal.updatedBy = updatedBy;
      await manager.save(SalaryWithdrawal, withdrawal);
      await manager.softRemove(SalaryWithdrawal, withdrawal);
      const data = dto
        ? await this.processSalaryWithdrawal(
            employeeId,
            dto,
            updatedBy,
            undefined,
            manager,
          )
        : undefined;
      return {
        success: true,
        message: dto
          ? 'Salary withdrawal updated successfully'
          : 'Salary withdrawal deleted and refunded successfully',
        data,
      };
    });
  }

  private async processSalaryWithdrawal(
    employeeId: string,
    dto: Omit<CreateSalaryWithdrawalDto, 'amount'> & { amount?: number },
    createdBy: string,
    targetRunId?: string,
    existingManager?: EntityManager,
  ) {
    const execute = async (manager: EntityManager) => {
      const employee = await manager.findOne(Employee, {
        where: { id: employeeId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!employee) throw new NotFoundException('Employee not found');
      if (!employee.departmentId)
        throw new BadRequestException('Employee department is required');
      const query = manager
        .getRepository(SalaryRun)
        .createQueryBuilder('run')
        .setLock('pessimistic_write')
        .where('run.employee_id = :employeeId', { employeeId });
      if (targetRunId) query.andWhere('run.id = :targetRunId', { targetRunId });
      const savedRuns = await query
        .orderBy('run.period_year', 'ASC')
        .addOrderBy('run.period_month', 'ASC')
        .getMany();
      const projectedRuns = await this.projectSalaryBalances(
        savedRuns,
        manager,
      );
      const balances = new Map(
        projectedRuns.map((run) => [run.id, moneyToCents(run.netPayable)]),
      );
      const runs = savedRuns.filter(
        (run) => balances.get(run.id)! > moneyToCents(run.amountPaid ?? '0'),
      );
      const availableCents = runs.reduce(
        (sum, run) =>
          sum + balances.get(run.id)! - moneyToCents(run.amountPaid ?? '0'),
        0n,
      );
      const available = Number(centsToMoney(availableCents));
      if (available <= 0)
        throw new BadRequestException('No accrued salary is available');
      const requested = dto.amount ?? available;
      if (requested > available)
        throw new BadRequestException(
          `Withdrawal cannot exceed available salary balance ${available.toFixed(2)}`,
        );
      if (
        !Number.isFinite(requested) ||
        requested <= 0 ||
        Math.abs(requested * 100 - Math.round(requested * 100)) > 0.000001
      )
        throw new BadRequestException('Withdrawal amount must be positive');
      await this.assertPaymentFunds(
        manager,
        dto.paymentMethod,
        dto,
        requested.toFixed(2),
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
      let remaining = moneyToCents(requested.toFixed(2));
      const allocations: SalaryWithdrawalAllocation[] = [];
      for (const run of runs) {
        if (remaining === 0n) break;
        const runRemaining =
          balances.get(run.id)! - moneyToCents(run.amountPaid ?? '0');
        const allocated = remaining < runRemaining ? remaining : runRemaining;
        const paid = moneyToCents(run.amountPaid ?? '0') + allocated;
        // Accrue a late bonus only when a user actually withdraws it. Updating
        // the application and reading balances never writes financial records.
        if (balances.get(run.id)! > moneyToCents(run.netPayable)) {
          const [accrual] = await manager.query(
            "SELECT COALESCE(SUM(CASE WHEN entry.entry_type = 'credit' THEN entry.amount ELSE -entry.amount END), 0)::text AS amount FROM ledger_entries entry JOIN chart_of_accounts account ON account.id = entry.account_id WHERE entry.source_type = 'salary' AND entry.source_id = $1 AND account.code = 'employee_salary_payable'",
            [run.id],
          );
          const accrued = moneyToCents(accrual?.amount ?? run.netPayable);
          const missing = balances.get(run.id)! - accrued;
          if (missing > 0n)
            await this.ledgerService.post(
              [
                {
                  departmentId: employee.departmentId,
                  accountCode: 'payroll_expense',
                  entryType: 'debit',
                  amount: centsToMoney(missing),
                  entryDate: new Date(dto.withdrawalDate),
                  sourceType: 'salary',
                  sourceId: run.id,
                  description: 'Bonus recorded after payroll',
                  createdBy,
                },
                {
                  departmentId: employee.departmentId,
                  accountCode: 'employee_salary_payable',
                  entryType: 'credit',
                  amount: centsToMoney(missing),
                  entryDate: new Date(dto.withdrawalDate),
                  sourceType: 'salary',
                  sourceId: run.id,
                  description: 'Bonus recorded after payroll',
                  createdBy,
                },
              ],
              manager,
            );
        }
        run.amountPaid = centsToMoney(paid);
        run.paymentStatus =
          paid === balances.get(run.id)! ? 'paid' : 'partially_paid';
        if (run.paymentStatus === 'paid') {
          run.paidDate = new Date(dto.withdrawalDate);
          run.paymentMethod = dto.paymentMethod;
        }
        allocations.push(
          manager.getRepository(SalaryWithdrawalAllocation).create({
            withdrawalId: withdrawal.id,
            salaryRunId: run.id,
            amount: centsToMoney(allocated),
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
    };
    return existingManager
      ? execute(existingManager)
      : this.dataSource.transaction(execute);
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
      data: await this.projectSalaryBalances(runs),
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
      data: { ...salaryBalancesWithBonuses([run], bonuses)[0], bonuses },
    };
  }

  private async projectSalaryBalances(
    runs: SalaryRun[],
    manager?: EntityManager,
  ) {
    if (!runs.length) return [];
    const bonuses = await (manager ?? this.dataSource)
      .getRepository(EmployeeBonus)
      .find({
        where: {
          employeeId: In([...new Set(runs.map((run) => run.employeeId))]),
        },
      });
    return salaryBalancesWithBonuses(runs, bonuses);
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
