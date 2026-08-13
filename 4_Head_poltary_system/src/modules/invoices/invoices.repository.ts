import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { CreateInvoiceDto, InvoiceQueryDto } from './invoice.dto';
import { Invoice } from './invoice.entity';

@Injectable()
export class InvoicesRepository {
  constructor(
    @InjectRepository(Invoice)
    private readonly repository: Repository<Invoice>,
  ) {}

  private repo(manager?: EntityManager): Repository<Invoice> {
    return manager ? manager.getRepository(Invoice) : this.repository;
  }

  create(
    dto: CreateInvoiceDto & { invoiceNumber: string; createdBy: string },
    manager?: EntityManager,
  ): Invoice {
    return this.repo(manager).create({
      ...dto,
      subtotal: Number(dto.subtotal).toFixed(2),
      taxAmount: Number(dto.taxAmount ?? 0).toFixed(2),
      totalAmount: Number(dto.totalAmount).toFixed(2),
      status: dto.status ?? 'posted',
      issuedAt: dto.issuedAt ? new Date(dto.issuedAt) : new Date(),
      createdBy: dto.createdBy,
      updatedBy: dto.createdBy,
    });
  }

  save(invoice: Invoice, manager?: EntityManager): Promise<Invoice> {
    return this.repo(manager).save(invoice);
  }

  findBySource(
    sourceType: string,
    sourceId: string,
    manager?: EntityManager,
  ): Promise<Invoice | null> {
    return this.repo(manager).findOne({
      where: { sourceType, sourceId, deletedAt: null } as any,
      relations: ['department', 'party'],
    });
  }

  findOne(id: string): Promise<Invoice | null> {
    return this.repository.findOne({
      where: { id, deletedAt: null } as any,
      relations: ['department', 'party'],
    });
  }

  async findAll(query: InvoiceQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const qb = this.repository
      .createQueryBuilder('invoice')
      .leftJoinAndSelect('invoice.department', 'department')
      .leftJoinAndSelect('invoice.party', 'party')
      .where('invoice.deleted_at IS NULL')
      // TypeORM's paginated relation query resolves ORDER BY expressions
      // against entity metadata, so these must be property paths rather than
      // physical snake_case column names.
      .orderBy('invoice.issuedAt', 'DESC')
      .addOrderBy('invoice.createdAt', 'DESC');
    if (query.invoiceType)
      qb.andWhere('invoice.invoice_type = :invoiceType', {
        invoiceType: query.invoiceType,
      });
    if (query.departmentId)
      qb.andWhere('invoice.department_id = :departmentId', {
        departmentId: query.departmentId,
      });
    if (query.sourceType)
      qb.andWhere('invoice.source_type = :sourceType', {
        sourceType: query.sourceType,
      });
    if (query.sourceId)
      qb.andWhere('invoice.source_id = :sourceId', {
        sourceId: query.sourceId,
      });
    if (query.startDate)
      qb.andWhere('invoice.issued_at >= :startDate', {
        startDate: `${query.startDate}T00:00:00.000Z`,
      });
    if (query.endDate)
      qb.andWhere('invoice.issued_at <= :endDate', {
        endDate: `${query.endDate}T23:59:59.999Z`,
      });
    const [items, total] = await qb
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();
    return {
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNextPage: page * limit < total,
      },
    };
  }
}
