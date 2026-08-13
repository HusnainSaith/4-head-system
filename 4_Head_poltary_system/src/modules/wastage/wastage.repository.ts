import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WastagePurchase } from './entities/wastage-purchase.entity';
import { WastageSale } from './entities/wastage-sale.entity';
import { IWastageRepository } from './interfaces/wastage-repository.interface';

@Injectable()
export class WastageRepository implements IWastageRepository {
  constructor(
    @InjectRepository(WastagePurchase)
    private readonly purchaseRepo: Repository<WastagePurchase>,
    @InjectRepository(WastageSale)
    private readonly saleRepo: Repository<WastageSale>,
  ) {}

  findAllPurchases(): Promise<WastagePurchase[]> {
    return this.purchaseRepo.find({
      where: { deletedAt: null } as any,
      order: { purchaseDate: 'DESC' },
    });
  }

  findPurchaseById(id: string): Promise<WastagePurchase | null> {
    return this.purchaseRepo.findOne({ where: { id, deletedAt: null } as any });
  }

  async updatePurchase(
    id: string,
    changes: Partial<WastagePurchase>,
  ): Promise<WastagePurchase> {
    await this.purchaseRepo.update({ id } as any, changes as any);
    return this.findPurchaseById(id) as Promise<WastagePurchase>;
  }

  async softDeletePurchase(id: string): Promise<void> {
    await this.purchaseRepo.update(
      { id } as any,
      { deletedAt: new Date() } as any,
    );
  }

  findAllSales(): Promise<WastageSale[]> {
    return this.saleRepo.find({
      where: { deletedAt: null } as any,
      order: { saleDate: 'DESC' },
    });
  }

  findSaleById(id: string): Promise<WastageSale | null> {
    return this.saleRepo.findOne({ where: { id, deletedAt: null } as any });
  }

  async updateSale(
    id: string,
    changes: Partial<WastageSale>,
  ): Promise<WastageSale> {
    await this.saleRepo.update({ id } as any, changes as any);
    return this.findSaleById(id) as Promise<WastageSale>;
  }

  async softDeleteSale(id: string): Promise<void> {
    await this.saleRepo.update({ id } as any, { deletedAt: new Date() } as any);
  }
}
