import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { EmployeesService } from '../../src/modules/employees/employees.service';
import { EmployeesRepository } from '../../src/modules/employees/employees.repository';
import { LedgerService } from '../../src/modules/ledger/ledger.service';

describe('EmployeesService', () => {
  let service: EmployeesService;
  let employeesRepo: jest.Mocked<EmployeesRepository>;
  let dataSource: jest.Mocked<DataSource>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmployeesService,
        {
          provide: EmployeesRepository,
          useValue: {
            findSalaryRun: jest.fn(),
            findEmployeeById: jest.fn(),
            findBonusesForPeriod: jest.fn(),
            findOutstandingAdvances: jest.fn(),
          },
        },
        {
          provide: DataSource,
          useValue: {
            transaction: jest.fn(),
          },
        },
        {
          provide: LedgerService,
          useValue: {},
        },
      ],
    }).compile();

    service = module.get<EmployeesService>(EmployeesService);
    employeesRepo = module.get(EmployeesRepository);
    dataSource = module.get(DataSource);
  });

  describe('runPayroll', () => {
    it('should throw ConflictException when payroll already exists for the period', async () => {
      employeesRepo.findSalaryRun.mockResolvedValue({
        id: 'existing-run',
      } as any);

      await expect(
        service.runPayroll(
          { employeeId: 'emp-1', periodMonth: 1, periodYear: 2025 } as any,
          'creator',
        ),
      ).rejects.toThrow(ConflictException);
    });

    it('should recover advances in FIFO order and calculate net payable', async () => {
      employeesRepo.findSalaryRun.mockResolvedValue(null as any);
      employeesRepo.findEmployeeById.mockResolvedValue({
        monthlySalary: '5000.00',
      } as any);
      employeesRepo.findBonusesForPeriod.mockResolvedValue([
        { amount: '500.00' },
      ] as any);
      const advances = [
        {
          id: 'adv-1',
          amount: '2000.00',
          amountRecovered: '0',
          deletedAt: null,
        } as any,
        {
          id: 'adv-2',
          amount: '4000.00',
          amountRecovered: '0',
          deletedAt: null,
        } as any,
      ];
      employeesRepo.findOutstandingAdvances.mockResolvedValue(advances);

      const manager = {
        create: jest.fn((entity, payload) => payload),
        save: jest.fn(async (_entity: any, record: any) => ({
          ...record,
          id: record.id ?? 'salary-run-1',
        })),
      } as any;
      dataSource.transaction.mockImplementation(async (fn: any) => fn(manager));

      const result = await service.runPayroll(
        { employeeId: 'emp-1', periodMonth: 1, periodYear: 2025 } as any,
        'creator',
      );

      expect(result.netPayable).toBe('0.00');
      expect(result.totalAdvancesDeducted).toBe('5500.00');
      expect(result.baseSalary).toBe('5000.00');
      expect(result.totalBonuses).toBe('500.00');
      expect(advances[0].recoveryStatus).toBe('fully_recovered');
      expect(advances[1].recoveryStatus).toBe('partially_recovered');
      expect(manager.save).toHaveBeenCalledWith(expect.anything(), advances[0]);
      expect(manager.save).toHaveBeenCalledWith(expect.anything(), advances[1]);
      expect(manager.save).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ employeeId: 'emp-1' }),
      );
    });
  });
});
