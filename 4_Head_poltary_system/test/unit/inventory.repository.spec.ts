import { EntityManager, Repository } from 'typeorm';
import { InventoryRepository } from '../../src/modules/inventory/inventory.repository';
import { Product } from '../../src/modules/inventory/entities/product.entity';
import { StockBalance } from '../../src/modules/inventory/entities/stock-balance.entity';
import { StockType } from '../../src/modules/inventory/enums/stock-type.enum';

describe('InventoryRepository', () => {
  const movementRepo = {} as Repository<any>;
  const writeoffRepo = {} as Repository<any>;

  it('returns an existing stock balance without changing it', async () => {
    const balance = {
      departmentId: 'department-1',
      quantityKg: '125.000',
      wac: '42.5000',
    } as StockBalance;
    const balanceRepo = {
      findOne: jest.fn().mockResolvedValue(balance),
    } as unknown as Repository<StockBalance>;
    const repository = new InventoryRepository(
      balanceRepo,
      movementRepo,
      writeoffRepo,
    );

    await expect(repository.getBalance('department-1')).resolves.toBe(balance);
  });

  it('atomically initializes a missing balance at zero', async () => {
    const initialized = {
      departmentId: 'department-1',
      productId: 'product-1',
      stockType: StockType.STANDARD,
      quantityKg: '0',
      wac: '0',
    } as StockBalance;
    const execute = jest.fn().mockResolvedValue({});
    const builder = {
      insert: jest.fn().mockReturnThis(),
      into: jest.fn().mockReturnThis(),
      values: jest.fn().mockReturnThis(),
      orIgnore: jest.fn().mockReturnThis(),
      execute,
    };
    const balanceRepo = {
      findOne: jest.fn().mockResolvedValueOnce(null),
      findOneOrFail: jest.fn().mockResolvedValue(initialized),
      createQueryBuilder: jest.fn().mockReturnValue(builder),
    } as unknown as Repository<StockBalance>;
    const productRepo = {
      findOneOrFail: jest.fn().mockResolvedValue({ id: 'product-1' }),
    } as unknown as Repository<Product>;
    const manager = {
      getRepository: jest.fn((entity) =>
        entity === StockBalance ? balanceRepo : productRepo,
      ),
    } as unknown as EntityManager;
    const repository = new InventoryRepository(
      {} as Repository<StockBalance>,
      movementRepo,
      writeoffRepo,
    );

    await expect(
      repository.getBalance('department-1', manager, StockType.STANDARD),
    ).resolves.toBe(initialized);
    expect(productRepo.findOneOrFail).toHaveBeenCalledWith({
      where: { sku: 'LIVE-CHICKEN-KG' },
    });
    expect(builder.values).toHaveBeenCalledWith({
      departmentId: 'department-1',
      productId: 'product-1',
      stockType: StockType.STANDARD,
      quantityKg: '0',
      wac: '0',
    });
    expect(builder.orIgnore).toHaveBeenCalled();
    expect(execute).toHaveBeenCalled();
  });
});
