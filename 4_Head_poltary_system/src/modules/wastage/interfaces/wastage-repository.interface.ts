import { WastagePurchase } from '../entities/wastage-purchase.entity';
import { WastageSale } from '../entities/wastage-sale.entity';

export interface IWastageRepository {
  findAllPurchases(): Promise<WastagePurchase[]>;
  findPurchaseById(id: string): Promise<WastagePurchase | null>;
  updatePurchase(
    id: string,
    changes: Partial<WastagePurchase>,
  ): Promise<WastagePurchase>;
  softDeletePurchase(id: string): Promise<void>;
  findAllSales(): Promise<WastageSale[]>;
  findSaleById(id: string): Promise<WastageSale | null>;
  updateSale(id: string, changes: Partial<WastageSale>): Promise<WastageSale>;
  softDeleteSale(id: string): Promise<void>;
}
