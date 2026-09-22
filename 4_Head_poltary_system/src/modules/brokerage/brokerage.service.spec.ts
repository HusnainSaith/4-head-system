import { BrokerageService } from './brokerage.service';

describe('BrokerageService profit and loss date filter', () => {
  it('queries the complete inclusive single-day range', async () => {
    const brokerageRepository = {
      sumActiveSaleTotal: jest.fn().mockResolvedValue('3705116.00'),
      sumActivePurchaseTotal: jest.fn().mockResolvedValue('3627618.00'),
      sumActivePurchaseQuantity: jest.fn().mockResolvedValue('100.000'),
      sumActiveSaleQuantity: jest.fn().mockResolvedValue('90.000'),
    };
    const ledgerService = {
      sumByAccount: jest.fn().mockResolvedValue('0.00'),
    };
    const expensesService = {
      sumTotal: jest.fn().mockResolvedValue('800.00'),
    };
    const service = new BrokerageService(
      brokerageRepository as never,
      { findByType: jest.fn().mockResolvedValue({ id: 'brokerage' }) } as never,
      { sumMovementQuantity: jest.fn().mockResolvedValue('10.000'), sumWriteoffQuantity: jest.fn().mockResolvedValue('1.000') } as never,
      ledgerService as never,
      {} as never,
      expensesService as never,
    );
    await service.onModuleInit();

    await expect(
      service.getProfitLoss('2026-07-02', '2026-07-02'),
    ).resolves.toMatchObject({
      revenue: '3705116.00',
      cogs: '3627618.00',
      operatingExpenses: '800.00',
      netProfit: '76698.00',
      purchaseQuantityKg: '100.000',
      saleQuantityKg: '90.000',
    });
    expect(brokerageRepository.sumActiveSaleTotal).toHaveBeenCalledWith(
      '2026-07-02',
      '2026-07-02',
    );
    expect(brokerageRepository.sumActivePurchaseTotal).toHaveBeenCalledWith(
      '2026-07-02',
      '2026-07-02',
    );
    expect(expensesService.sumTotal).toHaveBeenCalledWith(
      'brokerage',
      '2026-07-02',
      '2026-07-02',
    );
  });
});
