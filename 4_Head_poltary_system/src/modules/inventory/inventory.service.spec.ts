import { Test, TestingModule } from '@nestjs/testing';
import { InventoryService } from './inventory.service';
import { InventoryRepository } from './inventory.repository';
import { ExpensesService } from '../expenses/expenses.service';

describe('InventoryService', () => {
  let service: InventoryService;
  let inventoryRepository: {
    getBalance: jest.Mock;
    updateBalance: jest.Mock;
    saveMovement: jest.Mock;
  };
  let expensesService: { createSystemExpense: jest.Mock };

  beforeEach(async () => {
    inventoryRepository = {
      getBalance: jest.fn(),
      updateBalance: jest.fn(),
      saveMovement: jest.fn(),
    };
    expensesService = { createSystemExpense: jest.fn() };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InventoryService,
        {
          provide: InventoryRepository,
          useValue: inventoryRepository,
        },
        {
          provide: ExpensesService,
          useValue: expensesService,
        },
      ],
    }).compile();

    service = module.get<InventoryService>(InventoryService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('recalculateWac', () => {
    it('should correctly calculate WAC', () => {
      // (existing_qty * existing_wac + new_qty * new_rate) / (existing_qty + new_qty)
      // (10 * 100 + 5 * 130) / 15 = 1650 / 15 = 110
      const result = (service as any).recalculateWac(10, 100, 5, 130);
      expect(result).toBe(110);
    });
  });

  it('splits live Shop stock into dressed sale and processing loss movements', async () => {
    inventoryRepository.getBalance.mockResolvedValue({
      quantityKg: '200.000',
      wac: '410.0000',
    });
    const result = await service.applyShopSaleOut(
      'shop-dept',
      60,
      45,
      'sale-1',
      new Date('2026-07-15'),
      'user-1',
      {} as any,
    );

    expect(inventoryRepository.updateBalance).toHaveBeenCalledWith(
      'shop-dept',
      '140.000',
      '410.0000',
      expect.anything(),
    );
    expect(inventoryRepository.saveMovement).toHaveBeenCalledWith(
      expect.objectContaining({
        movementType: 'processing_loss_out',
        quantityKg: '15.000',
      }),
      expect.anything(),
    );
    expect(inventoryRepository.saveMovement).toHaveBeenCalledWith(
      expect.objectContaining({
        movementType: 'sale_out',
        quantityKg: '45.000',
      }),
      expect.anything(),
    );
    expect(expensesService.createSystemExpense).toHaveBeenCalledWith(
      expect.objectContaining({
        categoryName: 'Processing Loss',
        amount: '6150.00',
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
});
