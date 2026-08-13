import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { DataSource, IsNull } from 'typeorm';
import { CreateInvoiceDto, InvoiceQueryDto } from './invoice.dto';
import { Invoice } from './invoice.entity';
import { InvoiceNumberService } from './invoice-number.service';
import { InvoicesRepository } from './invoices.repository';
import { PdfService } from './pdf.service';
import { BrokeragePurchase } from '../brokerage/entities/brokerage-purchase.entity';
import { BrokerageSale } from '../brokerage/entities/brokerage-sale.entity';
import { SupplyPurchase } from '../supply/entities/supply-purchase.entity';
import { SupplySale } from '../supply/entities/supply-sale.entity';
import { InternalTransfer } from '../supply/entities/internal-transfer.entity';
import { WastagePurchase } from '../wastage/entities/wastage-purchase.entity';
import { WastageSale } from '../wastage/entities/wastage-sale.entity';
import { ShopSale } from '../fresh-chicken-shop/entities/shop-sale.entity';
import { Expense } from '../expenses/entities/expense.entity';

type InvoicePurchase = BrokeragePurchase | SupplyPurchase | WastagePurchase;
type InvoiceSale = BrokerageSale | SupplySale | WastageSale | ShopSale;

@Injectable()
export class InvoicesService {
  private readonly logger = new Logger(InvoicesService.name);

  constructor(
    private readonly repository: InvoicesRepository,
    private readonly numberService: InvoiceNumberService,
    private readonly pdfService: PdfService,
    private readonly dataSource: DataSource,
  ) {}

  async create(dto: CreateInvoiceDto, createdBy: string): Promise<Invoice> {
    const existing = await this.repository.findBySource(
      dto.sourceType,
      dto.sourceId,
    );
    if (existing) return existing;
    return this.dataSource.transaction(async (manager) => {
      const lockedExisting = await this.repository.findBySource(
        dto.sourceType,
        dto.sourceId,
        manager,
      );
      if (lockedExisting) return lockedExisting;
      const invoiceNumber = await this.numberService.next(manager);
      const invoice = this.repository.create(
        { ...dto, invoiceNumber, createdBy },
        manager,
      );
      const saved = await this.repository.save(invoice, manager);
      this.logger.log(`Created invoice ${saved.invoiceNumber}`);
      return saved;
    });
  }

  async findAll(query: InvoiceQueryDto) {
    return {
      success: true,
      message: 'Invoices retrieved',
      data: await this.repository.findAll(query),
    };
  }

  async findOne(id: string) {
    const invoice = await this.repository.findOne(id);
    if (!invoice) throw new NotFoundException('Invoice not found');
    return invoice;
  }

  findBySource(sourceType: string, sourceId: string) {
    return this.repository.findBySource(sourceType, sourceId);
  }

  /**
   * Backfills invoices for transactions posted before invoice generation was
   * introduced. Creation is idempotent through the invoice source unique key.
   */
  async ensureBySource(
    sourceType: string,
    sourceId: string,
    actorId: string,
  ): Promise<Invoice> {
    const existing = await this.repository.findBySource(sourceType, sourceId);
    if (existing) return existing;

    if (sourceType === 'internal_transfer') {
      const transfer = await this.dataSource
        .getRepository(InternalTransfer)
        .findOne({ where: { id: sourceId, deletedAt: IsNull() } as any });
      if (!transfer) {
        throw new NotFoundException('Invoice source transaction was not found');
      }
      const total = Number(transfer.totalAmount);
      return this.create(
        {
          invoiceType: 'transfer',
          departmentId: transfer.fromDepartmentId,
          sourceType,
          sourceId,
          lineItems: [
            {
              description: 'Internal chicken transfer',
              qty: Number(transfer.quantityKg),
              unit: 'kg',
              rate: Number(transfer.internalRatePerKg),
              amount: total,
            },
          ],
          subtotal: total,
          taxAmount: 0,
          totalAmount: total,
          notes: transfer.notes,
          status: 'posted',
          issuedAt: new Date(transfer.transferDate).toISOString(),
        },
        actorId,
      );
    }

    if (sourceType === 'expense') {
      const expense = await this.dataSource.getRepository(Expense).findOne({
        where: { id: sourceId, deletedAt: IsNull() } as any,
        relations: ['category'],
      });
      if (!expense) {
        throw new NotFoundException('Invoice source transaction was not found');
      }
      const amount = Number(expense.amount);
      return this.create(
        {
          invoiceType: 'expense',
          departmentId: expense.departmentId,
          sourceType,
          sourceId,
          lineItems: [
            {
              description:
                expense.description ??
                expense.category?.name ??
                'Operating Expense',
              qty: 1,
              unit: 'expense',
              rate: amount,
              amount,
            },
          ],
          subtotal: amount,
          taxAmount: 0,
          totalAmount: amount,
          notes: expense.receiptReference
            ? `Receipt: ${expense.receiptReference}`
            : undefined,
          status: 'posted',
          issuedAt: new Date(expense.expenseDate).toISOString(),
        },
        actorId,
      );
    }

    if (sourceType !== 'purchase' && sourceType !== 'sale') {
      throw new NotFoundException('Invoice source transaction was not found');
    }

    const transaction =
      sourceType === 'purchase'
        ? await this.findPurchase(sourceId)
        : await this.findSale(sourceId);
    if (!transaction) {
      throw new NotFoundException('Invoice source transaction was not found');
    }

    const isShopSale = transaction instanceof ShopSale;
    const quantity = Number(transaction.quantityKg);
    const rate = Number(transaction.ratePerKg);
    const total = Number(transaction.totalAmount);
    const partyId = isShopSale
      ? transaction.customerPartyId
      : transaction.partyId;
    const transactionDate =
      sourceType === 'purchase'
        ? (transaction as InvoicePurchase).purchaseDate
        : (transaction as InvoiceSale).saleDate;

    return this.create(
      {
        invoiceType: sourceType,
        departmentId: transaction.departmentId,
        sourceType,
        sourceId,
        partyId,
        lineItems: [
          {
            description: isShopSale
              ? 'Retail dressed chicken sale'
              : `Chicken ${sourceType}`,
            qty: quantity,
            unit: 'kg',
            rate,
            amount: total,
          },
        ],
        subtotal: total,
        taxAmount: 0,
        totalAmount: total,
        notes:
          'notes' in transaction
            ? transaction.notes
            : 'description' in transaction
              ? transaction.description
              : undefined,
        status: 'posted',
        issuedAt: new Date(transactionDate).toISOString(),
      },
      actorId,
    );
  }

  private async findPurchase(id: string): Promise<InvoicePurchase | null> {
    for (const entity of [
      BrokeragePurchase,
      SupplyPurchase,
      WastagePurchase,
    ] as const) {
      const transaction = await this.dataSource.getRepository(entity).findOne({
        where: { id, deletedAt: IsNull() } as any,
      });
      if (transaction) return transaction;
    }
    return null;
  }

  private async findSale(id: string): Promise<InvoiceSale | null> {
    for (const entity of [
      BrokerageSale,
      SupplySale,
      WastageSale,
      ShopSale,
    ] as const) {
      const transaction = await this.dataSource.getRepository(entity).findOne({
        where: { id, deletedAt: IsNull() } as any,
      });
      if (transaction) return transaction;
    }
    return null;
  }

  async generatePdf(id: string): Promise<Buffer> {
    const invoice = await this.findOne(id);
    return this.pdfService.generate(this.pdfService.buildInvoiceDoc(invoice));
  }

  async cancel(id: string, actorId: string): Promise<Invoice> {
    const invoice = await this.findOne(id);
    if (invoice.status === 'cancelled')
      throw new ConflictException('Invoice is already cancelled');
    invoice.status = 'cancelled';
    invoice.updatedBy = actorId;
    return this.repository.save(invoice);
  }
}
