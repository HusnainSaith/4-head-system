import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ShopSale } from './entities/shop-sale.entity';
import { InternalTransfer } from '../supply/entities/internal-transfer.entity';
import { IShopRepository } from './interfaces/shop-repository.interface';
import { ShopDressingBatch } from './entities/shop-dressing-batch.entity';

@Injectable()
export class FreshChickenShopRepository implements IShopRepository {
  constructor(
    @InjectRepository(ShopSale)
    private readonly saleRepo: Repository<ShopSale>,
    @InjectRepository(ShopDressingBatch)
    private readonly batchRepo: Repository<ShopDressingBatch>,
  ) {}

  findAllSales(): Promise<ShopSale[]> {
    return this.saleRepo.find({
      where: { deletedAt: null } as any,
      relations: ['customerParty', 'vehicle'],
      order: { saleDate: 'DESC' },
    });
  }

  findBatches(from?: Date, to?: Date): Promise<ShopDressingBatch[]> {
    const query = this.batchRepo
      .createQueryBuilder('batch')
      .where('batch.deletedAt IS NULL');
    if (from) query.andWhere('batch.batchDate >= :from', { from });
    if (to) query.andWhere('batch.batchDate <= :to', { to });
    return query
      .orderBy('batch.batchDate', 'DESC')
      .addOrderBy('batch.createdAt', 'DESC')
      .getMany();
  }

  findBatchById(id: string): Promise<ShopDressingBatch | null> {
    return this.batchRepo.findOne({ where: { id, deletedAt: null } as any });
  }

  findSaleById(id: string): Promise<ShopSale | null> {
    return this.saleRepo.findOne({ where: { id, deletedAt: null } as any });
  }

  async updateSale(id: string, changes: Partial<ShopSale>): Promise<ShopSale> {
    await this.saleRepo.update({ id } as any, changes as any);
    return this.findSaleById(id) as Promise<ShopSale>;
  }

  async softDeleteSale(id: string): Promise<void> {
    await this.saleRepo.update({ id } as any, { deletedAt: new Date() } as any);
  }

  async sumActiveSaleQuantity(from?: string, to?: string): Promise<string> {
    const query = this.saleRepo.createQueryBuilder('sale')
      .select('COALESCE(SUM(sale.quantityKg), 0)', 'total')
      .where('sale.deletedAt IS NULL');
    if (from) query.andWhere('sale.saleDate >= :from', { from });
    if (to) query.andWhere('sale.saleDate <= :to', { to });
    const row = await query.getRawOne<{ total: string }>();
    return Number(row?.total ?? 0).toFixed(3);
  }

  async sumActiveIncomingQuantity(departmentId: string, from?: string, to?: string): Promise<string> {
    const repo = this.saleRepo.manager.getRepository(InternalTransfer);
    const query = repo.createQueryBuilder('transfer')
      .select('COALESCE(SUM(transfer.quantityKg), 0)', 'total')
      .where('transfer.deletedAt IS NULL')
      .andWhere('transfer.toDepartmentId = :departmentId', { departmentId });
    if (from) query.andWhere('transfer.transferDate >= :from', { from });
    if (to) query.andWhere('transfer.transferDate <= :to', { to });
    const row = await query.getRawOne<{ total: string }>();
    return Number(row?.total ?? 0).toFixed(3);
  }

  async findIncomingTransfers(
    departmentId: string,
  ): Promise<InternalTransfer[]> {
    // InternalTransfer is included in TypeOrmModule.forFeature for this module
    const repo = (this.saleRepo.manager as any).getRepository(InternalTransfer);
    return repo.find({
      where: { toDepartmentId: departmentId, deletedAt: null } as any,
      order: { transferDate: 'DESC' },
    } as any);
  }
}
