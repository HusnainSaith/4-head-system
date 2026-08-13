import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { StockMovement } from './entities/stock-movement.entity';
import { CreateStockMovementDto } from './dto/create-stock-movement.dto';
import {
  InventoryRepositoryInterface,
  INVENTORY_REPOSITORY,
} from './interfaces/inventory-repository.interface';

@Injectable()
export class StockMovementService {
  constructor(
    @Inject(INVENTORY_REPOSITORY)
    private readonly stockMovementRepo: InventoryRepositoryInterface,
  ) {}

  async create(createDto: CreateStockMovementDto): Promise<StockMovement> {
    const movement = this.stockMovementRepo.createMovement(createDto as any);
    return this.stockMovementRepo.saveMovement(movement as any);
  }

  async findAll(
    departmentId?: string,
    productId?: string,
  ): Promise<StockMovement[]> {
    const where: any = {};
    if (departmentId) where.departmentId = departmentId;
    if (productId) where.productId = productId;
    return this.stockMovementRepo.findMovements({
      where,
      order: { movementDate: 'DESC' },
      relations: ['product', 'department'],
    } as any);
  }

  async findOne(id: string): Promise<StockMovement> {
    const movement = await this.stockMovementRepo.findMovementOne({
      where: { id },
      relations: ['product', 'department'],
    } as any);
    if (!movement)
      throw new NotFoundException(`Stock movement with ID "${id}" not found`);
    return movement;
  }

  async findByPurchase(purchaseId: string): Promise<StockMovement[]> {
    return this.stockMovementRepo.findByPurchase(purchaseId);
  }

  async findBySale(saleId: string): Promise<StockMovement[]> {
    return this.stockMovementRepo.findBySale(saleId);
  }
}
