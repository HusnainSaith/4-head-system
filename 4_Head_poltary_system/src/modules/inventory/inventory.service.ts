import { Injectable, BadRequestException } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { InventoryRepository } from './inventory.repository';
import { ExpensesService } from '../expenses/expenses.service';
import { StockMovementSourceEnum } from './enums/stock-movement.enum';
import { StockType } from './enums/stock-type.enum';

@Injectable()
export class InventoryService {
  constructor(
    private readonly inventoryRepo: InventoryRepository,
    private readonly expensesService: ExpensesService,
  ) {}

  private recalculateWac(
    existing_qty: number,
    existing_wac: number,
    new_qty: number,
    new_rate: number,
  ): number {
    if (existing_qty + new_qty === 0) return new_rate;
    const newWac =
      (existing_qty * existing_wac + new_qty * new_rate) /
      (existing_qty + new_qty);
    return Math.round(newWac * 10_000) / 10_000;
  }

  async applyPurchaseIn(
    departmentId: string,
    quantityKg: number,
    ratePerKg: number,
    sourceType: StockMovementSourceEnum,
    sourceId: string,
    movementDate: Date,
    manager: EntityManager,
    stockType: StockType = StockType.STANDARD,
  ): Promise<{ newQuantity: number; newWac: number }> {
    const balance = await this.inventoryRepo.getBalance(
      departmentId,
      manager,
      stockType,
    );
    const existingQty = parseFloat(balance.quantityKg as any);
    const existingWac = parseFloat(balance.wac as any);
    const newWac = this.recalculateWac(
      existingQty,
      existingWac,
      quantityKg,
      ratePerKg,
    );
    const newQty = existingQty + quantityKg;

    await this.inventoryRepo.updateBalance(
      departmentId,
      newQty.toFixed(3),
      newWac.toFixed(4),
      manager,
    );
    await this.inventoryRepo.saveMovement(
      {
        departmentId,
        movementType: 'purchase_in',
        quantityKg: quantityKg.toFixed(3),
        ratePerKg: ratePerKg.toFixed(4),
        resultingWac: newWac.toFixed(4),
        sourceType: sourceType || StockMovementSourceEnum.PURCHASE,
        sourceId,
        movementDate,
        stockType,
      },
      manager,
    );

    return { newQuantity: newQty, newWac };
  }

  async applySaleOut(
    departmentId: string,
    quantityKg: number,
    sourceType: StockMovementSourceEnum,
    sourceId: string,
    movementDate: Date,
    manager: EntityManager,
    stockType: StockType = StockType.STANDARD,
  ): Promise<{ currentWac: number }> {
    return this.applyStockOut(
      departmentId,
      quantityKg,
      'sale_out',
      sourceType,
      sourceId,
      movementDate,
      manager,
      stockType,
    );
  }

  private async applyStockOut(
    departmentId: string,
    quantityKg: number,
    movementType: 'sale_out' | 'writeoff_out',
    sourceType: StockMovementSourceEnum,
    sourceId: string,
    movementDate: Date,
    manager: EntityManager,
    stockType: StockType = StockType.STANDARD,
  ): Promise<{ currentWac: number }> {
    const balance = await this.inventoryRepo.getBalance(
      departmentId,
      manager,
      stockType,
    );
    const currentQty = parseFloat(balance.quantityKg as any);
    const currentWac = parseFloat(balance.wac as any);

    if (quantityKg > currentQty) {
      throw new BadRequestException(
        `Insufficient stock. Available: ${currentQty}kg, Requested: ${quantityKg}kg`,
      );
    }

    const newQty = currentQty - quantityKg;
    await this.inventoryRepo.updateBalance(
      departmentId,
      newQty.toFixed(3),
      currentWac.toFixed(4),
      manager,
      stockType,
    );
    await this.inventoryRepo.saveMovement(
      {
        departmentId,
        movementType,
        quantityKg: quantityKg.toFixed(3),
        ratePerKg: currentWac.toFixed(4),
        resultingWac: currentWac.toFixed(4),
        sourceType: sourceType || StockMovementSourceEnum.SALE,
        sourceId,
        movementDate,
        stockType,
      },
      manager,
    );

    return { currentWac };
  }

  async applyShopSaleOut(
    departmentId: string,
    liveWeightKg: number,
    dressedWeightKg: number,
    sourceId: string,
    movementDate: Date,
    createdBy: string,
    manager: EntityManager,
  ): Promise<{
    currentWac: number;
    cogsAmount: number;
    processingLossAmount: number;
  }> {
    if (dressedWeightKg > liveWeightKg) {
      throw new BadRequestException('Dressed weight cannot exceed live weight');
    }

    const balance = await this.inventoryRepo.getBalance(departmentId, manager);
    const currentQty = Number(balance.quantityKg);
    const currentWac = Number(balance.wac);
    if (liveWeightKg > currentQty) {
      throw new BadRequestException(
        `Insufficient stock. Available: ${currentQty}kg, Requested: ${liveWeightKg}kg`,
      );
    }

    await this.inventoryRepo.updateBalance(
      departmentId,
      (currentQty - liveWeightKg).toFixed(3),
      currentWac.toFixed(4),
      manager,
    );

    const shrinkageKg = liveWeightKg - dressedWeightKg;
    if (shrinkageKg > 0) {
      await this.inventoryRepo.saveMovement(
        {
          departmentId,
          movementType: 'processing_loss_out',
          quantityKg: shrinkageKg.toFixed(3),
          ratePerKg: currentWac.toFixed(4),
          resultingWac: currentWac.toFixed(4),
          sourceType: StockMovementSourceEnum.SALE,
          sourceId,
          movementDate,
          createdBy,
        },
        manager,
      );
    }
    await this.inventoryRepo.saveMovement(
      {
        departmentId,
        movementType: 'sale_out',
        quantityKg: dressedWeightKg.toFixed(3),
        ratePerKg: currentWac.toFixed(4),
        resultingWac: currentWac.toFixed(4),
        sourceType: StockMovementSourceEnum.SALE,
        sourceId,
        movementDate,
        createdBy,
      },
      manager,
    );

    const processingLossAmount = shrinkageKg * currentWac;
    if (processingLossAmount > 0) {
      await this.expensesService.createSystemExpense(
        {
          departmentId,
          categoryName: 'Processing Loss',
          amount: processingLossAmount.toFixed(2),
          date: movementDate,
          sourceType: 'processing_loss',
          sourceId,
          createdBy,
          description: `${shrinkageKg.toFixed(3)}kg live-to-dressed processing loss`,
          offsetAccountCode: 'inventory',
        },
        manager,
      );
    }

    return {
      currentWac,
      cogsAmount: dressedWeightKg * currentWac,
      processingLossAmount,
    };
  }

  async applyDressingBatch(
    departmentId: string,
    liveWeightKg: number,
    dressedWeightKg: number,
    sourceId: string,
    batchDate: Date,
    createdBy: string,
    manager: EntityManager,
  ): Promise<{
    liveWac: number;
    dressedWac: number;
    shrinkageKg: number;
    processingLossAmount: number;
  }> {
    if (dressedWeightKg > liveWeightKg) {
      throw new BadRequestException('Dressed weight cannot exceed live weight');
    }
    const live = await this.inventoryRepo.getBalance(
      departmentId,
      manager,
      StockType.LIVE,
    );
    const dressed = await this.inventoryRepo.getBalance(
      departmentId,
      manager,
      StockType.DRESSED,
    );
    const liveQuantity = Number(live.quantityKg);
    const liveWac = Number(live.wac);
    if (liveWeightKg > liveQuantity) {
      throw new BadRequestException(
        `Insufficient live stock. Available: ${liveQuantity}kg, Requested: ${liveWeightKg}kg`,
      );
    }
    const dressedQuantity = Number(dressed.quantityKg);
    const dressedWac = this.recalculateWac(
      dressedQuantity,
      Number(dressed.wac),
      dressedWeightKg,
      liveWac,
    );
    await this.inventoryRepo.updateBalance(
      departmentId,
      (liveQuantity - liveWeightKg).toFixed(3),
      liveWac.toFixed(4),
      manager,
      StockType.LIVE,
    );
    await this.inventoryRepo.saveMovement(
      {
        departmentId,
        stockType: StockType.LIVE,
        movementType: 'dressing_out',
        quantityKg: liveWeightKg.toFixed(3),
        ratePerKg: liveWac.toFixed(4),
        resultingWac: liveWac.toFixed(4),
        sourceType: StockMovementSourceEnum.DRESSING_BATCH,
        sourceId,
        movementDate: batchDate,
        createdBy,
      },
      manager,
    );
    await this.inventoryRepo.updateBalance(
      departmentId,
      (dressedQuantity + dressedWeightKg).toFixed(3),
      dressedWac.toFixed(4),
      manager,
      StockType.DRESSED,
    );
    await this.inventoryRepo.saveMovement(
      {
        departmentId,
        stockType: StockType.DRESSED,
        movementType: 'dressing_in',
        quantityKg: dressedWeightKg.toFixed(3),
        ratePerKg: liveWac.toFixed(4),
        resultingWac: dressedWac.toFixed(4),
        sourceType: StockMovementSourceEnum.DRESSING_BATCH,
        sourceId,
        movementDate: batchDate,
        createdBy,
      },
      manager,
    );
    const shrinkageKg = liveWeightKg - dressedWeightKg;
    const processingLossAmount = shrinkageKg * liveWac;
    if (processingLossAmount > 0) {
      await this.expensesService.createSystemExpense(
        {
          departmentId,
          categoryName: 'Processing Loss',
          amount: processingLossAmount.toFixed(2),
          date: batchDate,
          sourceType: 'processing_loss',
          sourceId,
          createdBy,
          description: `${shrinkageKg.toFixed(3)}kg dressing batch processing loss`,
          offsetAccountCode: 'inventory',
        },
        manager,
      );
    }
    return { liveWac, dressedWac, shrinkageKg, processingLossAmount };
  }

  async applyTransferIn(
    departmentId: string,
    quantityKg: number,
    internalRatePerKg: number,
    sourceId: string,
    transferDate: Date,
    manager: EntityManager,
    stockType: StockType = StockType.STANDARD,
  ): Promise<{ newWac: number }> {
    const balance = await this.inventoryRepo.getBalance(
      departmentId,
      manager,
      stockType,
    );
    const existingQty = parseFloat(balance.quantityKg as any);
    const existingWac = parseFloat(balance.wac as any);
    const newWac = this.recalculateWac(
      existingQty,
      existingWac,
      quantityKg,
      internalRatePerKg,
    );
    const newQty = existingQty + quantityKg;

    await this.inventoryRepo.updateBalance(
      departmentId,
      newQty.toFixed(3),
      newWac.toFixed(4),
      manager,
      stockType,
    );
    await this.inventoryRepo.saveMovement(
      {
        departmentId,
        movementType: 'transfer_in',
        quantityKg: quantityKg.toFixed(3),
        ratePerKg: internalRatePerKg.toFixed(4),
        resultingWac: newWac.toFixed(4),
        sourceType: StockMovementSourceEnum.INTERNAL_TRANSFER,
        sourceId,
        movementDate: transferDate,
        stockType,
      },
      manager,
    );

    return { newWac };
  }

  async createWriteoff(dto: any, createdBy: string, manager: EntityManager) {
    const stockType = dto.stockType ?? StockType.STANDARD;
    const writeoff = await this.inventoryRepo.saveWriteoff(
      {
        departmentId: dto.departmentId,
        quantityKg: dto.quantityKg.toFixed(3),
        reason: dto.reason,
        note: dto.note,
        writeoffDate: new Date(dto.writeoffDate),
        valuationAmount: '0',
        stockType,
        createdBy,
      },
      manager,
    );

    const { currentWac } = await this.applyStockOut(
      dto.departmentId,
      dto.quantityKg,
      'writeoff_out',
      StockMovementSourceEnum.STOCK_WRITEOFF,
      writeoff.id,
      new Date(dto.writeoffDate),
      manager,
      stockType,
    );

    const valuationAmount = dto.quantityKg * currentWac;
    await this.expensesService.createSystemExpense(
      {
        departmentId: dto.departmentId,
        categoryName: 'Wastage Loss',
        amount: valuationAmount.toFixed(2),
        date: new Date(dto.writeoffDate),
        sourceType: 'stock_writeoff',
        sourceId: writeoff.id,
        createdBy,
        description: dto.note ?? `${dto.quantityKg.toFixed(3)}kg ${dto.reason}`,
        offsetAccountCode: 'inventory',
      },
      manager,
    );

    writeoff.valuationAmount = valuationAmount.toFixed(2);
    return this.inventoryRepo.saveWriteoff(writeoff, manager);
  }

  async getBalance(
    departmentId: string,
    stockType: StockType = StockType.STANDARD,
  ) {
    return this.inventoryRepo.getBalance(departmentId, undefined, stockType);
  }

  async reverseSourceMovement(
    departmentId: string,
    sourceType: StockMovementSourceEnum,
    sourceId: string,
    manager: EntityManager,
  ) {
    const movements = await this.inventoryRepo.findSourceMovements(
      departmentId,
      sourceType,
      sourceId,
      manager,
    );
    if (movements.length === 0)
      throw new BadRequestException('Original stock movement was not found');
    const incoming = movements.filter((movement) =>
      ['purchase_in', 'transfer_in', 'opening_stock', 'dressing_in'].includes(
        movement.movementType,
      ),
    );
    if (incoming.length > 0) {
      const movement = incoming[0];
      const quantity = Number(movement.quantityKg);
      const balance = await this.inventoryRepo.getBalance(
        departmentId,
        manager,
        movement.stockType ?? StockType.STANDARD,
      );
      const currentQuantity = Number(balance.quantityKg);
      if (quantity > currentQuantity)
        throw new BadRequestException(
          'Purchase cannot be cancelled because its stock has already been consumed',
        );
      const newQuantity = currentQuantity - quantity;
      const remainingValue =
        currentQuantity * Number(balance.wac) -
        quantity * Number(movement.ratePerKg);
      const newWac =
        newQuantity === 0 ? 0 : Math.max(0, remainingValue / newQuantity);
      await this.inventoryRepo.updateBalance(
        departmentId,
        newQuantity.toFixed(3),
        newWac.toFixed(4),
        manager,
        movement.stockType ?? StockType.STANDARD,
      );
      await this.inventoryRepo.saveMovement(
        {
          departmentId,
          movementType: 'sale_out',
          quantityKg: quantity.toFixed(3),
          ratePerKg: movement.ratePerKg,
          resultingWac: newWac.toFixed(4),
          sourceType,
          sourceId,
          movementDate: new Date(),
        },
        manager,
      );
    } else {
      const quantity = movements.reduce(
        (total, movement) => total + Number(movement.quantityKg),
        0,
      );
      const totalValue = movements.reduce(
        (total, movement) =>
          total + Number(movement.quantityKg) * Number(movement.ratePerKg),
        0,
      );
      await this.applyPurchaseIn(
        departmentId,
        quantity,
        totalValue / quantity,
        sourceType,
        sourceId,
        new Date(),
        manager,
        movements[0].stockType ?? StockType.STANDARD,
      );
    }
  }

  async reverseDressingBatch(
    departmentId: string,
    sourceId: string,
    actorId: string,
    manager: EntityManager,
  ): Promise<void> {
    const movements = await this.inventoryRepo.findSourceMovements(
      departmentId,
      StockMovementSourceEnum.DRESSING_BATCH,
      sourceId,
      manager,
    );
    const liveOut = movements.find(
      (item) => item.movementType === 'dressing_out',
    );
    const dressedIn = movements.find(
      (item) => item.movementType === 'dressing_in',
    );
    if (!liveOut || !dressedIn) {
      throw new BadRequestException(
        'Dressing batch stock movements were not found',
      );
    }
    const dressedBalance = await this.inventoryRepo.getBalance(
      departmentId,
      manager,
      StockType.DRESSED,
    );
    const currentQuantity = Number(dressedBalance.quantityKg);
    const quantity = Number(dressedIn.quantityKg);
    if (quantity > currentQuantity) {
      throw new BadRequestException(
        'Dressing batch cannot be deleted because its dressed stock has been consumed',
      );
    }
    const remainingQuantity = currentQuantity - quantity;
    const remainingValue =
      currentQuantity * Number(dressedBalance.wac) -
      quantity * Number(dressedIn.ratePerKg);
    const remainingWac =
      remainingQuantity === 0
        ? 0
        : Math.max(0, remainingValue / remainingQuantity);
    await this.inventoryRepo.updateBalance(
      departmentId,
      remainingQuantity.toFixed(3),
      remainingWac.toFixed(4),
      manager,
      StockType.DRESSED,
    );
    await this.inventoryRepo.saveMovement(
      {
        departmentId,
        stockType: StockType.DRESSED,
        movementType: 'sale_out',
        quantityKg: quantity.toFixed(3),
        ratePerKg: Number(dressedIn.ratePerKg).toFixed(4),
        resultingWac: remainingWac.toFixed(4),
        sourceType: StockMovementSourceEnum.DRESSING_BATCH,
        sourceId,
        movementDate: new Date(),
        createdBy: actorId,
      },
      manager,
    );
    await this.applyPurchaseIn(
      departmentId,
      Number(liveOut.quantityKg),
      Number(liveOut.ratePerKg),
      StockMovementSourceEnum.DRESSING_BATCH,
      sourceId,
      new Date(),
      manager,
      StockType.LIVE,
    );
  }
}
