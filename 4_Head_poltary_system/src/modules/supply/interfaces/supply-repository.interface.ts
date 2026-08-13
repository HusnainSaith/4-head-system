import { SupplyPurchase } from '../entities/supply-purchase.entity';
import { SupplySale } from '../entities/supply-sale.entity';
import { InternalTransfer } from '../entities/internal-transfer.entity';

export interface ISupplyRepository {
  findAllPurchases(): Promise<SupplyPurchase[]>;
  findPurchaseById(id: string): Promise<SupplyPurchase | null>;
  updatePurchase(
    id: string,
    changes: Partial<SupplyPurchase>,
  ): Promise<SupplyPurchase>;
  softDeletePurchase(id: string): Promise<void>;
  findAllSales(): Promise<SupplySale[]>;
  findSaleById(id: string): Promise<SupplySale | null>;
  updateSale(id: string, changes: Partial<SupplySale>): Promise<SupplySale>;
  softDeleteSale(id: string): Promise<void>;
  findAllTransfers(): Promise<InternalTransfer[]>;
  findTransferById(id: string): Promise<InternalTransfer | null>;
  updateTransfer(
    id: string,
    changes: Partial<InternalTransfer>,
  ): Promise<InternalTransfer>;
}
