import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository, SelectQueryBuilder } from 'typeorm';
import { Party } from '../parties/entities/party.entity';
import { InternalTransfer } from './entities/internal-transfer.entity';
import { SupplyPurchase } from './entities/supply-purchase.entity';
import { SupplySale } from './entities/supply-sale.entity';
import { SupplyListQueryDto, TransferListQueryDto } from './dto/supply.dto';

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}
export interface PaginatedResult<T> {
  items: T[];
  pagination: Pagination;
}

@Injectable()
export class SupplyRepository {
  constructor(
    @InjectRepository(SupplyPurchase)
    private readonly purchaseRepo: Repository<SupplyPurchase>,
    @InjectRepository(SupplySale)
    private readonly saleRepo: Repository<SupplySale>,
    @InjectRepository(InternalTransfer)
    private readonly transferRepo: Repository<InternalTransfer>,
    @InjectRepository(Party) private readonly partyRepo: Repository<Party>,
  ) {}

  private paginate<T>(
    query: SelectQueryBuilder<T>,
    page: number,
    limit: number,
  ): Promise<[T[], number]> {
    return query
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();
  }

  private result<T>(
    items: T[],
    total: number,
    page: number,
    limit: number,
  ): PaginatedResult<T> {
    const totalPages = Math.ceil(total / limit);
    return {
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    };
  }

  private transactionFilters<T>(
    query: SelectQueryBuilder<T>,
    alias: string,
    dateColumn: string,
    filters: SupplyListQueryDto,
  ) {
    if (filters.from)
      query.andWhere(`${alias}.${dateColumn} >= :from`, { from: filters.from });
    if (filters.to)
      query.andWhere(`${alias}.${dateColumn} <= :to`, { to: filters.to });
    if (filters.paymentMethod)
      query.andWhere(`${alias}.paymentMethod = :paymentMethod`, {
        paymentMethod: filters.paymentMethod,
      });
    if (filters.partyId)
      query.andWhere(`${alias}.partyId = :partyId`, {
        partyId: filters.partyId,
      });
    if (filters.vehicleId)
      query.andWhere(`${alias}.vehicleId = :vehicleId`, {
        vehicleId: filters.vehicleId,
      });
    if (filters.status)
      query.andWhere(`${alias}.status = :status`, { status: filters.status });
    return query;
  }

  async findAllPurchases(
    filters: SupplyListQueryDto,
  ): Promise<PaginatedResult<SupplyPurchase>> {
    const page = filters.page;
    const limit = filters.limit;
    const query = this.transactionFilters(
      this.purchaseRepo
        .createQueryBuilder('purchase')
        .leftJoinAndSelect('purchase.party', 'party')
        .leftJoinAndSelect('purchase.vehicle', 'vehicle'),
      'purchase',
      'purchaseDate',
      filters,
    )
      .orderBy('purchase.purchaseDate', 'DESC')
      .addOrderBy('purchase.id', 'DESC');
    const [items, total] = await this.paginate(query, page, limit);
    return this.result(items, total, page, limit);
  }

  findPurchaseById(
    id: string,
    manager?: EntityManager,
  ): Promise<SupplyPurchase | null> {
    const repository =
      manager?.getRepository(SupplyPurchase) ?? this.purchaseRepo;
    return repository.findOne({
      where: { id },
      relations: { party: true, vehicle: true },
    });
  }

  async updatePurchase(
    id: string,
    changes: Partial<SupplyPurchase>,
    manager?: EntityManager,
  ): Promise<SupplyPurchase> {
    const repository =
      manager?.getRepository(SupplyPurchase) ?? this.purchaseRepo;
    await repository.update({ id }, changes);
    return this.findPurchaseById(id, manager) as Promise<SupplyPurchase>;
  }

  async findAllSales(
    filters: SupplyListQueryDto,
  ): Promise<PaginatedResult<SupplySale>> {
    const page = filters.page;
    const limit = filters.limit;
    const query = this.transactionFilters(
      this.saleRepo
        .createQueryBuilder('sale')
        .leftJoinAndSelect('sale.party', 'party')
        .leftJoinAndSelect('sale.vehicle', 'vehicle'),
      'sale',
      'saleDate',
      filters,
    )
      .orderBy('sale.saleDate', 'DESC')
      .addOrderBy('sale.id', 'DESC');
    const [items, total] = await this.paginate(query, page, limit);
    return this.result(items, total, page, limit);
  }

  findSaleById(
    id: string,
    manager?: EntityManager,
  ): Promise<SupplySale | null> {
    const repository = manager?.getRepository(SupplySale) ?? this.saleRepo;
    return repository.findOne({
      where: { id },
      relations: { party: true, vehicle: true },
    });
  }

  async updateSale(
    id: string,
    changes: Partial<SupplySale>,
    manager?: EntityManager,
  ): Promise<SupplySale> {
    const repository = manager?.getRepository(SupplySale) ?? this.saleRepo;
    await repository.update({ id }, changes);
    return this.findSaleById(id, manager) as Promise<SupplySale>;
  }

  async findAllTransfers(
    filters: TransferListQueryDto,
  ): Promise<PaginatedResult<InternalTransfer>> {
    const page = filters.page;
    const limit = filters.limit;
    const query = this.transferRepo
      .createQueryBuilder('transfer')
      .leftJoinAndSelect('transfer.fromDepartment', 'fromDepartment')
      .leftJoinAndSelect('transfer.toDepartment', 'toDepartment')
      .leftJoinAndSelect('transfer.vehicle', 'vehicle');
    if (filters.from)
      query.andWhere('transfer.transferDate >= :from', { from: filters.from });
    if (filters.to)
      query.andWhere('transfer.transferDate <= :to', { to: filters.to });
    if (filters.settlementStatus)
      query.andWhere('transfer.settlementStatus = :settlementStatus', {
        settlementStatus: filters.settlementStatus,
      });
    query
      .orderBy('transfer.transferDate', 'DESC')
      .addOrderBy('transfer.id', 'DESC');
    const [items, total] = await this.paginate(query, page, limit);
    return this.result(items, total, page, limit);
  }

  findTransferById(
    id: string,
    manager?: EntityManager,
    lock = false,
  ): Promise<InternalTransfer | null> {
    const repository =
      manager?.getRepository(InternalTransfer) ?? this.transferRepo;
    const query = repository
      .createQueryBuilder('transfer')
      .where('transfer.id = :id', { id });
    if (lock) query.setLock('pessimistic_write');
    else
      query
        .leftJoinAndSelect('transfer.fromDepartment', 'fromDepartment')
        .leftJoinAndSelect('transfer.toDepartment', 'toDepartment')
        .leftJoinAndSelect('transfer.vehicle', 'vehicle');
    return query.getOne();
  }

  async updateTransfer(
    id: string,
    changes: Partial<InternalTransfer>,
    manager?: EntityManager,
  ): Promise<InternalTransfer> {
    const repository =
      manager?.getRepository(InternalTransfer) ?? this.transferRepo;
    await repository.update({ id }, changes);
    return this.findTransferById(id, manager) as Promise<InternalTransfer>;
  }

  findInternalPartyByDepartmentId(departmentId: string): Promise<Party | null> {
    return this.partyRepo
      .createQueryBuilder('party')
      .leftJoin('party.departments', 'department')
      .where(
        '(party.linked_department_id = :departmentId OR department.id = :departmentId)',
        { departmentId },
      )
      .andWhere('party.deleted_at IS NULL')
      .getOne();
  }
}
