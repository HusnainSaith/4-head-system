import { BrokeragePurchase } from '../entities/brokerage-purchase.entity';
import { BrokerageSale } from '../entities/brokerage-sale.entity';
import {
  ListBrokeragePurchasesQueryDto,
  ListBrokerageSalesQueryDto,
} from '../dto/brokerage.dto';
import { PaginatedResult } from '../brokerage.repository';

export interface IBrokerageRepository {
  findAllPurchasesPaginated(
    query: ListBrokeragePurchasesQueryDto,
  ): Promise<PaginatedResult<BrokeragePurchase>>;
  findPurchaseById(id: string): Promise<BrokeragePurchase | null>;
  updatePurchase(
    id: string,
    changes: Partial<BrokeragePurchase>,
  ): Promise<BrokeragePurchase>;
  softDeletePurchase(id: string): Promise<void>;

  findAllSalesPaginated(
    query: ListBrokerageSalesQueryDto,
  ): Promise<PaginatedResult<BrokerageSale>>;
  findSaleById(id: string): Promise<BrokerageSale | null>;
  updateSale(
    id: string,
    changes: Partial<BrokerageSale>,
  ): Promise<BrokerageSale>;
  softDeleteSale(id: string): Promise<void>;
}
