import { FindManyOptions, FindOneOptions, EntityManager } from 'typeorm';
import { StockMovement } from '../entities/stock-movement.entity';
import { StockBalance } from '../entities/stock-balance.entity';

export const INVENTORY_REPOSITORY = 'INVENTORY_REPOSITORY';

export interface InventoryRepositoryInterface {
  getBalance(
    departmentId: string,
    manager?: EntityManager,
  ): Promise<StockBalance>;
  updateBalance(
    departmentId: string,
    quantityKg: string,
    weightedAvgCost: string,
    manager?: EntityManager,
  ): Promise<void>;
  createMovement(data: Partial<StockMovement>): StockMovement;
  saveMovement(
    movement: Partial<StockMovement>,
    manager?: EntityManager,
  ): Promise<StockMovement>;
  findMovements(
    options?: FindManyOptions<StockMovement>,
  ): Promise<StockMovement[]>;
  findMovementOne(
    options?: FindOneOptions<StockMovement>,
  ): Promise<StockMovement | null>;
  findByPurchase(purchaseId: string): Promise<StockMovement[]>;
  findBySale(saleId: string): Promise<StockMovement[]>;
  saveWriteoff(writeoff: Partial<any>, manager?: EntityManager): Promise<any>;
}
