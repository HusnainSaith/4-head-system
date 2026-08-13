import { DataSource } from 'typeorm';
import { InvoicesService } from './invoices.service';
import { InvoicesRepository } from './invoices.repository';
import { InvoiceNumberService } from './invoice-number.service';
import { PdfService } from './pdf.service';
import { SupplySale } from '../supply/entities/supply-sale.entity';
import { Expense } from '../expenses/entities/expense.entity';

describe('InvoicesService', () => {
  it('backfills a missing sale invoice from the authoritative transaction', async () => {
    const repository = {
      findBySource: jest.fn().mockResolvedValue(null),
    } as unknown as InvoicesRepository;
    const sale = {
      id: '7d9869c1-d709-433d-a16d-73bc129ea99e',
      departmentId: '3b220c0e-a0c0-4546-8922-e3dc90dc4a81',
      partyId: 'd45f8747-629c-4323-92f1-a8883309bdfd',
      quantityKg: '25.000',
      ratePerKg: '410.00',
      totalAmount: '10250.00',
      saleDate: new Date('2026-07-15'),
      notes: 'Historical supply sale',
    } as SupplySale;
    const dataSource = {
      getRepository: jest.fn((entity) => ({
        findOne: jest
          .fn()
          .mockResolvedValue(entity === SupplySale ? sale : null),
      })),
    } as unknown as DataSource;
    const service = new InvoicesService(
      repository,
      {} as InvoiceNumberService,
      {} as PdfService,
      dataSource,
    );
    const created = { id: 'invoice-id' } as any;
    const create = jest.spyOn(service, 'create').mockResolvedValue(created);

    await expect(
      service.ensureBySource(
        'sale',
        sale.id,
        'c71345ae-8bcc-428d-baa8-96f108e89891',
      ),
    ).resolves.toBe(created);
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        invoiceType: 'sale',
        departmentId: sale.departmentId,
        partyId: sale.partyId,
        subtotal: 10250,
        totalAmount: 10250,
        lineItems: [
          expect.objectContaining({ qty: 25, rate: 410, amount: 10250 }),
        ],
      }),
      'c71345ae-8bcc-428d-baa8-96f108e89891',
    );
  });

  it('backfills a system-generated expense invoice', async () => {
    const repository = {
      findBySource: jest.fn().mockResolvedValue(null),
    } as unknown as InvoicesRepository;
    const expense = {
      id: '02866560-3339-4f17-8b75-b478869990b4',
      departmentId: '3b220c0e-a0c0-4546-8922-e3dc90dc4a81',
      amount: '3250.00',
      expenseDate: new Date('2026-07-15'),
      description: 'Live-to-dressed processing loss',
      sourceType: 'processing_loss',
      category: { name: 'Wastage Loss' },
    } as Expense;
    const dataSource = {
      getRepository: jest.fn(() => ({
        findOne: jest.fn().mockResolvedValue(expense),
      })),
    } as unknown as DataSource;
    const service = new InvoicesService(
      repository,
      {} as InvoiceNumberService,
      {} as PdfService,
      dataSource,
    );
    const created = { id: 'expense-invoice-id' } as any;
    const create = jest.spyOn(service, 'create').mockResolvedValue(created);

    await expect(
      service.ensureBySource(
        'expense',
        expense.id,
        'c71345ae-8bcc-428d-baa8-96f108e89891',
      ),
    ).resolves.toBe(created);
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        invoiceType: 'expense',
        departmentId: expense.departmentId,
        subtotal: 3250,
        totalAmount: 3250,
        lineItems: [
          expect.objectContaining({
            description: 'Live-to-dressed processing loss',
            amount: 3250,
          }),
        ],
      }),
      'c71345ae-8bcc-428d-baa8-96f108e89891',
    );
  });
});
