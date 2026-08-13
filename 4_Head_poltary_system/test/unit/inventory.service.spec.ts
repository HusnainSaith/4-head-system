import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { InventoryService } from '../../src/modules/inventory/inventory.service';
import { InventoryRepository } from '../../src/modules/inventory/inventory.repository';
import { StockMovementSourceEnum } from '../../src/modules/inventory/enums/stock-movement.enum';
import { ExpensesService } from '../../src/modules/expenses/expenses.service';

describe('InventoryService', () => {
  let service: InventoryService;
  let inventoryRepo: jest.Mocked<InventoryRepository>;
  let expensesService: { createSystemExpense: jest.Mock };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InventoryService,
        {
          provide: InventoryRepository,
          useValue: {
            getBalance: jest.fn(),
            updateBalance: jest.fn(),
            saveMovement: jest.fn(),
          },
        },
        {
          provide: ExpensesService,
          useValue: { createSystemExpense: jest.fn() },
        },
      ],
    }).compile();

    service = module.get<InventoryService>(InventoryService);
    inventoryRepo = module.get(InventoryRepository);
    expensesService = module.get(ExpensesService);
  });

  describe('applyPurchaseIn', () => {
    it('should calculate weighted average cost on purchase', async () => {
      inventoryRepo.getBalance.mockResolvedValue({
        quantityKg: '100.000',
        wac: '50.00',
      } as any);
      inventoryRepo.updateBalance.mockResolvedValue(undefined as any);
      inventoryRepo.saveMovement.mockResolvedValue(undefined as any);

      const result = await service.applyPurchaseIn(
        'dept-1',
        50,
        70,
        StockMovementSourceEnum.PURCHASE,
        'src-1',
        new Date('2025-01-01'),
        {} as any,
      );

      expect(result.newQuantity).toBe(150);
      expect(result.newWac).toBe(56.6667);
      expect(inventoryRepo.updateBalance).toHaveBeenCalledWith(
        'dept-1',
        '150.000',
        '56.6667',
        expect.anything(),
      );
      expect(inventoryRepo.saveMovement).toHaveBeenCalledWith(
        expect.objectContaining({
          departmentId: 'dept-1',
          movementType: 'purchase_in',
          quantityKg: '50.000',
          ratePerKg: '70.0000',
          resultingWac: '56.6667',
        }),
        expect.anything(),
      );
    });
  });

  describe('applySaleOut', () => {
    it('should throw BadRequestException when requested quantity exceeds available stock', async () => {
      inventoryRepo.getBalance.mockResolvedValue({
        quantityKg: '20.000',
        wac: '45.00',
      } as any);

      await expect(
        service.applySaleOut(
          'dept-1',
          25,
          StockMovementSourceEnum.SALE,
          'src-1',
          new Date('2025-01-01'),
          {} as any,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should preserve current WAC when selling stock out', async () => {
      inventoryRepo.getBalance.mockResolvedValue({
        quantityKg: '200.000',
        wac: '45.50',
      } as any);
      inventoryRepo.updateBalance.mockResolvedValue(undefined as any);
      inventoryRepo.saveMovement.mockResolvedValue(undefined as any);

      const result = await service.applySaleOut(
        'dept-1',
        50,
        StockMovementSourceEnum.SALE,
        'src-1',
        new Date('2025-01-01'),
        {} as any,
      );

      expect(result.currentWac).toBe(45.5);
      expect(inventoryRepo.updateBalance).toHaveBeenCalledWith(
        'dept-1',
        '150.000',
        '45.5000',
        expect.anything(),
        'standard',
      );
      expect(inventoryRepo.saveMovement).toHaveBeenCalledWith(
        expect.objectContaining({
          departmentId: 'dept-1',
          movementType: 'sale_out',
          quantityKg: '50.000',
          ratePerKg: '45.5000',
          resultingWac: '45.5000',
        }),
        expect.anything(),
      );
    });
  });

  describe('applyShopSaleOut', () => {
    it('deducts live weight and splits dressed sale from processing loss at locked WAC', async () => {
      inventoryRepo.getBalance.mockResolvedValue({
        quantityKg: '200.000',
        wac: '410.0000',
      } as any);
      inventoryRepo.updateBalance.mockResolvedValue(undefined as any);
      inventoryRepo.saveMovement.mockResolvedValue(undefined as any);
      expensesService.createSystemExpense.mockResolvedValue({} as any);

      const result = await service.applyShopSaleOut(
        'shop-dept',
        60,
        45,
        'sale-1',
        new Date('2026-07-15'),
        'user-1',
        {} as any,
      );

      expect(inventoryRepo.updateBalance).toHaveBeenCalledWith(
        'shop-dept',
        '140.000',
        '410.0000',
        expect.anything(),
      );
      expect(inventoryRepo.saveMovement).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({
          movementType: 'processing_loss_out',
          quantityKg: '15.000',
          ratePerKg: '410.0000',
          sourceId: 'sale-1',
        }),
        expect.anything(),
      );
      expect(inventoryRepo.saveMovement).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          movementType: 'sale_out',
          quantityKg: '45.000',
          ratePerKg: '410.0000',
          sourceId: 'sale-1',
        }),
        expect.anything(),
      );
      expect(expensesService.createSystemExpense).toHaveBeenCalledWith(
        expect.objectContaining({
          categoryName: 'Processing Loss',
          amount: '6150.00',
          sourceType: 'processing_loss',
          offsetAccountCode: 'inventory',
        }),
        expect.anything(),
      );
      expect(result).toEqual({
        currentWac: 410,
        cogsAmount: 18450,
        processingLossAmount: 6150,
      });
    });

    it('rejects dressed weight above live weight before changing inventory', async () => {
      await expect(
        service.applyShopSaleOut(
          'shop-dept',
          45,
          46,
          'sale-1',
          new Date('2026-07-15'),
          'user-1',
          {} as any,
        ),
      ).rejects.toThrow('Dressed weight cannot exceed live weight');
      expect(inventoryRepo.updateBalance).not.toHaveBeenCalled();
    });
  });
});
