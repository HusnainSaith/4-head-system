import { ConflictException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { InvoiceNumberService } from '../../../src/modules/invoices/invoice-number.service';
import { InvoicesRepository } from '../../../src/modules/invoices/invoices.repository';
import { InvoicesService } from '../../../src/modules/invoices/invoices.service';
import { PdfService } from '../../../src/modules/invoices/pdf.service';

describe('InvoicesService', () => {
  const repository = {
    findBySource: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    findAll: jest.fn(),
  };
  const numberService = { next: jest.fn() };
  const pdf = { buildInvoiceDoc: jest.fn(), generate: jest.fn() };
  const manager = {};
  const dataSource = {
    transaction: jest.fn((work: (manager: unknown) => unknown) =>
      work(manager),
    ),
  };
  const service = new InvoicesService(
    repository as unknown as InvoicesRepository,
    numberService as unknown as InvoiceNumberService,
    pdf as unknown as PdfService,
    dataSource as unknown as DataSource,
  );

  beforeEach(() => jest.clearAllMocks());

  it('creates and saves an invoice with a concurrency-safe number', async () => {
    repository.findBySource.mockResolvedValue(null);
    numberService.next.mockResolvedValue('INV-2026-000001');
    repository.create.mockImplementation((value) => value);
    repository.save.mockImplementation(async (value) => ({
      id: 'invoice-1',
      ...value,
    }));
    const result = await service.create(
      {
        invoiceType: 'sale',
        departmentId: '00000000-0000-4000-8000-000000000001',
        sourceType: 'sale',
        sourceId: '00000000-0000-4000-8000-000000000002',
        lineItems: [
          {
            description: 'Chicken Sale',
            qty: 10,
            unit: 'kg',
            rate: 400,
            amount: 4000,
          },
        ],
        subtotal: 4000,
        totalAmount: 4000,
      },
      '00000000-0000-4000-8000-000000000003',
    );
    expect(result.invoiceNumber).toBe('INV-2026-000001');
    expect(repository.save).toHaveBeenCalled();
  });

  it('returns a generated PDF buffer', async () => {
    repository.findOne.mockResolvedValue({ id: 'invoice-1' });
    pdf.buildInvoiceDoc.mockReturnValue({ content: [] });
    pdf.generate.mockResolvedValue(Buffer.from('%PDF'));
    await expect(service.generatePdf('invoice-1')).resolves.toEqual(
      Buffer.from('%PDF'),
    );
  });

  it('returns null when a source has no invoice', async () => {
    repository.findBySource.mockResolvedValue(null);
    await expect(service.findBySource('sale', 'source-1')).resolves.toBeNull();
  });

  it('rejects cancellation of an already-cancelled invoice', async () => {
    repository.findOne.mockResolvedValue({
      id: 'invoice-1',
      status: 'cancelled',
    });
    await expect(service.cancel('invoice-1', 'actor')).rejects.toBeInstanceOf(
      ConflictException,
    );
  });
});
