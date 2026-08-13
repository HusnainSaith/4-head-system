import { VehiclesRepository } from './vehicles.repository';

describe('VehiclesRepository', () => {
  let repository: VehiclesRepository;
  let typeOrmRepo: any;
  let fuelRepo: any;
  let maintenanceRepo: any;

  beforeEach(() => {
    typeOrmRepo = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      findAndCount: jest.fn(),
    };
    fuelRepo = { find: jest.fn() };
    maintenanceRepo = { find: jest.fn() };
    repository = new VehiclesRepository(
      typeOrmRepo as any,
      fuelRepo as any,
      maintenanceRepo as any,
    );
  });

  it('creates a vehicle entity through TypeORM repository', () => {
    const dto = { registrationNumber: 'ABC123' };
    (typeOrmRepo.create as jest.Mock).mockReturnValue(dto);

    const result = repository.create(dto as any);

    expect(typeOrmRepo.create).toHaveBeenCalledWith(dto as any);
    expect(result).toBe(dto);
  });

  it('saves a vehicle entity through TypeORM repository', async () => {
    const vehicle = { id: '1' };
    (typeOrmRepo.save as jest.Mock).mockResolvedValue(vehicle);

    const result = await repository.save(vehicle as any);

    expect(typeOrmRepo.save).toHaveBeenCalledWith(vehicle);
    expect(result).toBe(vehicle);
  });

  it('finds one vehicle by criteria', async () => {
    const criteria = { id: '1' };
    const vehicle = { id: '1' };
    (typeOrmRepo.findOne as jest.Mock).mockResolvedValue(vehicle);

    const result = await repository.findOne(criteria);

    expect(typeOrmRepo.findOne).toHaveBeenCalledWith({ where: criteria });
    expect(result).toBe(vehicle);
  });

  it('finds vehicles with count', async () => {
    const options = { take: 10 };
    const data = [{ id: '1' }];
    (typeOrmRepo.findAndCount as jest.Mock).mockResolvedValue([data, 1]);

    const result = await repository.findAndCount(options as any);

    expect(typeOrmRepo.findAndCount).toHaveBeenCalledWith(options);
    expect(result).toEqual([data, 1]);
  });
});
