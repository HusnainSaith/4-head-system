import { ShopSale } from '../entities/shop-sale.entity';
import { InternalTransfer } from '../../supply/entities/internal-transfer.entity';

export interface IShopRepository {
  findAllSales(): Promise<ShopSale[]>;
  findSaleById(id: string): Promise<ShopSale | null>;
  updateSale(id: string, changes: Partial<ShopSale>): Promise<ShopSale>;
  softDeleteSale(id: string): Promise<void>;
  findIncomingTransfers(departmentId: string): Promise<InternalTransfer[]>;
}
