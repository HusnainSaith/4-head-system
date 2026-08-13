import { NotFoundException } from '@nestjs/common';
import { VehiclesService } from './vehicles.service';
import { VehiclesRepository } from '../repositories/vehicles.repository';
import { ExpensesService } from '../expenses/expenses.service';
import { LedgerService } from '../ledger/ledger.service';
import { DataSource } from 'typeorm';
import { VehicleTypeEnum } from './entities/vehicle.entity';

describe('VehiclesService', () => {
  let service: VehiclesService;
  let repo: Partial<VehiclesRepository>;
  let expensesService: Partial<ExpensesService>;
  let ledgerService: Partial<LedgerService>;
  let dataSource: Partial<DataSource>;

  beforeEach(() => {
    repo = {
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      findAndCount: jest.fn(),
    };
    expensesService = {
      createSystemExpense: jest.fn(),
    };
    ledgerService = {};
    dataSource = {
      transaction: jest.fn(),
    } as any;

    service = new VehiclesService(
      repo as VehiclesRepository,
      expensesService as ExpensesService,
      dataSource as DataSource,
    );
  });

  it('creates a vehicle', async () => {
    (repo.findOne as jest.Mock).mockResolvedValue(null);
    (repo.create as jest.Mock).mockReturnValue({ registrationNumber: 'ABC' });
    (repo.save as jest.Mock).mockResolvedValue({
      id: '1',
      registrationNumber: 'ABC',
    });

    const res = await service.create({
      registrationNumber: 'ABC',
      vehicleType: VehicleTypeEnum.TRUCK,
      model: 'X',
      year: 2020,
      departmentId: '00000000-0000-4000-8000-000000000001',
    });

    expect(repo.findOne).toHaveBeenCalledWith({ registrationNumber: 'ABC' });
    expect(repo.create).toHaveBeenCalledWith({
      registrationNumber: 'ABC',
      vehicleType: VehicleTypeEnum.TRUCK,
      model: 'X',
      year: 2020,
      departmentId: '00000000-0000-4000-8000-000000000001',
      isActive: true,
    });
    expect(res.success).toBe(true);
    expect(res.data).toHaveProperty('id', '1');
  });

  it('throws when vehicle exists', async () => {
    (repo.findOne as jest.Mock).mockResolvedValue({ id: 'existing' });
    await expect(
      service.create({ registrationNumber: 'ABC' } as any),
    ).rejects.toThrow();
  });

  it('findAll returns paginated results with metadata', async () => {
    (repo.findAndCount as jest.Mock).mockResolvedValue([[{ id: '1' }], 1]);

    const res = await service.findAll(2, 5);

    expect(repo.findAndCount).toHaveBeenCalledWith({
      skip: 5,
      take: 5,
      order: { createdAt: 'DESC' },
      where: undefined,
      relations: { department: true, driverUser: true },
    });
    expect(res.data.pagination).toEqual({
      total: 1,
      page: 2,
      limit: 5,
      totalPages: 1,
      hasNextPage: false,
      hasPreviousPage: true,
    });
  });

  it('scopes vehicle results to the requested department', async () => {
    (repo.findAndCount as jest.Mock).mockResolvedValue([[], 0]);

    await service.findAll(1, 100, 'department-1');

    expect(repo.findAndCount).toHaveBeenCalledWith(
      expect.objectContaining({ where: { departmentId: 'department-1' } }),
    );
  });

  it('findOne returns vehicle when found', async () => {
    (repo.findOne as jest.Mock).mockResolvedValue({ id: '1' });
    const res = await service.findOne('1');
    expect(res.data.id).toBe('1');
  });

  it('findOne throws NotFoundException when missing', async () => {
    (repo.findOne as jest.Mock).mockResolvedValue(null);
    await expect(service.findOne('2')).rejects.toThrow(NotFoundException);
  });
});
