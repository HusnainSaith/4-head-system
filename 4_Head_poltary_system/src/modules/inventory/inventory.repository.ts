import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, EntityManager } from 'typeorm';
import { StockBalance } from './entities/stock-balance.entity';
import { StockMovement } from './entities/stock-movement.entity';
import { StockWriteoff } from './entities/stock-writeoff.entity';
import { Product } from './entities/product.entity';
import { StockType } from './enums/stock-type.enum';

@Injectable()
export class InventoryRepository {
  constructor(
    @InjectRepository(StockBalance)
    private readonly balanceRepo: Repository<StockBalance>,
    @InjectRepository(StockMovement)
    private readonly movementRepo: Repository<StockMovement>,
    @InjectRepository(StockWriteoff)
    private readonly writeoffRepo: Repository<StockWriteoff>,
  ) {}

  async getBalance(
    departmentId: string,
    manager?: EntityManager,
    stockType: StockType = StockType.STANDARD,
  ): Promise<StockBalance> {
    const repo = manager
      ? manager.getRepository(StockBalance)
      : this.balanceRepo;
    const findOptions = {
      where: { departmentId, stockType } as any,
      ...(manager ? { lock: { mode: 'pessimistic_write' as const } } : {}),
    };
    const existing = await repo.findOne(findOptions);
    if (existing) return existing;

    const productRepo = manager
      ? manager.getRepository(Product)
      : this.balanceRepo.manager.getRepository(Product);
    const product = await productRepo.findOneOrFail({
      where: { sku: 'LIVE-CHICKEN-KG' },
    });

    // Imported/legacy databases can be missing a department's seeded balance.
    // ON CONFLICT DO NOTHING makes concurrent first access safe and never resets
    // an existing quantity or weighted-average cost.
    await repo
      .createQueryBuilder()
      .insert()
      .into(StockBalance)
      .values({
        departmentId,
        productId: product.id,
        stockType,
        quantityKg: '0',
        wac: '0',
      })
      .orIgnore()
      .execute();

    return repo.findOneOrFail(findOptions);
  }

  async updateBalance(
    departmentId: string,
    quantityKg: string,
    wac: string,
    manager?: EntityManager,
    stockType: StockType = StockType.STANDARD,
    updatedBy?: string,
  ): Promise<void> {
    const repo = manager
      ? manager.getRepository(StockBalance)
      : this.balanceRepo;
    await repo.update(
      { departmentId, stockType } as any,
      { quantityKg, wac, updatedBy } as any,
    );
  }

  async saveMovement(
    movement: Partial<StockMovement>,
    manager?: EntityManager,
  ): Promise<StockMovement> {
    const repo = manager
      ? manager.getRepository(StockMovement)
      : this.movementRepo;
    return repo.save(repo.create(movement));
  }

  findSourceMovement(
    sourceType: StockMovement['sourceType'],
    sourceId: string,
    manager?: EntityManager,
  ) {
    const repo = manager
      ? manager.getRepository(StockMovement)
      : this.movementRepo;
    return repo.findOne({ where: { sourceType, sourceId } });
  }

  findSourceMovements(
    departmentId: string,
    sourceType: StockMovement['sourceType'],
    sourceId: string,
    manager?: EntityManager,
  ) {
    const repo = manager
      ? manager.getRepository(StockMovement)
      : this.movementRepo;
    return repo.find({ where: { departmentId, sourceType, sourceId } });
  }

  createMovement(data: Partial<StockMovement>) {
    return this.movementRepo.create(data);
  }

  findMovements(options: Parameters<Repository<StockMovement>['find']>[0]) {
    return this.movementRepo.find(options as any);
  }

  findMovementOne(
    options: Parameters<Repository<StockMovement>['findOne']>[0],
  ) {
    return this.movementRepo.findOne(options as any);
  }

  async findByPurchase(purchaseId: string): Promise<StockMovement[]> {
    return this.movementRepo.find({
      where: { purchaseId } as any,
      relations: ['product'],
    } as any);
  }

  async findBySale(saleId: string): Promise<StockMovement[]> {
    return this.movementRepo.find({
      where: { saleId } as any,
      relations: ['product'],
    } as any);
  }

  async saveWriteoff(
    writeoff: Partial<StockWriteoff>,
    manager?: EntityManager,
  ): Promise<StockWriteoff> {
    const repo = manager
      ? manager.getRepository(StockWriteoff)
      : this.writeoffRepo;
    return repo.save(repo.create(writeoff));
  }

  findWriteoffs(departmentId: string) {
    return this.writeoffRepo.find({
      where: { departmentId } as any,
      order: { writeoffDate: 'DESC', createdAt: 'DESC' },
    });
  }

  findWriteoff(id: string, departmentId: string, manager?: EntityManager) {
    const repo = manager
      ? manager.getRepository(StockWriteoff)
      : this.writeoffRepo;
    return repo.findOne({ where: { id, departmentId } as any });
  }

  async softDeleteWriteoff(
    id: string,
    updatedBy: string,
    manager: EntityManager,
  ) {
    await manager.update(StockWriteoff, id, {
      deletedAt: new Date(),
      updatedBy,
    });
  }

  async sumWriteoffQuantity(
    departmentId: string,
    from?: string,
    to?: string,
  ): Promise<string> {
    const query = this.writeoffRepo
      .createQueryBuilder('writeoff')
      .select('COALESCE(SUM(writeoff.quantityKg), 0)', 'total')
      .where('writeoff.departmentId = :departmentId', { departmentId })
      .andWhere('writeoff.deletedAt IS NULL');
    if (from) query.andWhere('writeoff.writeoffDate >= :from', { from });
    if (to) query.andWhere('writeoff.writeoffDate <= :to', { to });
    const row = await query.getRawOne<{ total: string }>();
    return Number(row?.total ?? 0).toFixed(3);
  }

  async sumMovementQuantity(
    departmentId: string,
    movementTypes: string[],
    from: Date,
    to: Date,
  ): Promise<string> {
    const row = await this.movementRepo.createQueryBuilder('movement')
      .select('COALESCE(SUM(movement.quantityKg), 0)', 'total')
      .where('movement.departmentId = :departmentId', { departmentId })
      .andWhere('movement.movementType IN (:...movementTypes)', { movementTypes })
      .andWhere('movement.sourceType != :writeoffSource', {
        writeoffSource: 'stock_writeoff',
      })
      .andWhere('movement.movementDate >= :from', { from })
      .andWhere('movement.movementDate < :to', { to })
      .getRawOne<{ total: string }>();
    return Number(row?.total ?? 0).toFixed(3);
  }
}
