import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  BrokeragePurchase,
  BrokeragePurchaseStatus,
} from './entities/brokerage-purchase.entity';
import {
  BrokerageSale,
  BrokerageSaleStatus,
} from './entities/brokerage-sale.entity';
import {
  ListBrokeragePurchasesQueryDto,
  ListBrokerageSalesQueryDto,
} from './dto/brokerage.dto';

export interface PaginatedResult<T> {
  items: T[];
  summary: { totalAmount: string; settled: string; outstanding: string };
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}

@Injectable()
export class BrokerageRepository {
  constructor(
    @InjectRepository(BrokeragePurchase)
    private readonly purchaseRepo: Repository<BrokeragePurchase>,
    @InjectRepository(BrokerageSale)
    private readonly saleRepo: Repository<BrokerageSale>,
  ) {}

  async sumActivePurchaseTotal(from?: string, to?: string): Promise<string> {
    const query = this.purchaseRepo
      .createQueryBuilder('bp')
      .select('COALESCE(SUM(bp.total_amount), 0)', 'sum')
      .where('bp.deleted_at IS NULL')
      .andWhere('bp.status = :status', {
        status: BrokeragePurchaseStatus.ACTIVE,
      });
    if (from) query.andWhere('bp.purchase_date >= :from', { from });
    if (to) query.andWhere('bp.purchase_date <= :to', { to });
    const result = await query.getRawOne<{ sum: string }>();
    return Number(result?.sum ?? 0).toFixed(2);
  }

  async sumActiveSaleTotal(from?: string, to?: string): Promise<string> {
    const query = this.saleRepo
      .createQueryBuilder('bs')
      .select('COALESCE(SUM(bs.total_amount), 0)', 'sum')
      .where('bs.deleted_at IS NULL')
      .andWhere('bs.status = :status', { status: BrokerageSaleStatus.ACTIVE });
    if (from) query.andWhere('bs.sale_date >= :from', { from });
    if (to) query.andWhere('bs.sale_date <= :to', { to });
    const result = await query.getRawOne<{ sum: string }>();
    return Number(result?.sum ?? 0).toFixed(2);
  }

  async sumActivePurchaseQuantity(from?: string, to?: string): Promise<string> {
    const query = this.purchaseRepo.createQueryBuilder('bp')
      .select('COALESCE(SUM(bp.quantityKg), 0)', 'total')
      .where('bp.deleted_at IS NULL')
      .andWhere('bp.status = :status', { status: BrokeragePurchaseStatus.ACTIVE });
    if (from) query.andWhere('bp.purchase_date >= :from', { from });
    if (to) query.andWhere('bp.purchase_date <= :to', { to });
    const row = await query.getRawOne<{ total: string }>();
    return Number(row?.total ?? 0).toFixed(3);
  }

  async sumActiveSaleQuantity(from?: string, to?: string): Promise<string> {
    const query = this.saleRepo.createQueryBuilder('bs')
      .select('COALESCE(SUM(bs.quantityKg), 0)', 'total')
      .where('bs.deleted_at IS NULL')
      .andWhere('bs.status = :status', { status: BrokerageSaleStatus.ACTIVE });
    if (from) query.andWhere('bs.sale_date >= :from', { from });
    if (to) query.andWhere('bs.sale_date <= :to', { to });
    const row = await query.getRawOne<{ total: string }>();
    return Number(row?.total ?? 0).toFixed(3);
  }

  async findAllPurchasesPaginated(
    query: ListBrokeragePurchasesQueryDto,
  ): Promise<PaginatedResult<BrokeragePurchase>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const offset = (page - 1) * limit;

    const status = query.status ?? BrokeragePurchaseStatus.ACTIVE;
    const params: Record<string, unknown> = { status };
    const conditions: string[] = [
      'bp.deleted_at IS NULL',
      'bp.status = :status',
    ];

    if (query.from) {
      conditions.push('bp.purchase_date >= :from');
      params.from = query.from;
    }
    if (query.to) {
      conditions.push('bp.purchase_date <= :to');
      params.to = query.to;
    }
    if (query.paymentMethod) {
      conditions.push('bp.payment_method = :pm');
      params.pm = query.paymentMethod;
    }
    if (query.partyId) {
      conditions.push('bp.party_id = :partyId');
      params.partyId = query.partyId;
    }
    if (query.vehicleId) {
      conditions.push('bp.vehicle_id = :vehicleId');
      params.vehicleId = query.vehicleId;
    }
    if (query.search) {
      conditions.push('(party.name ILIKE :search OR vehicle.registration_number ILIKE :search OR bp.description ILIKE :search OR CAST(bp.purchase_date AS TEXT) ILIKE :search)');
      params.search = `%${query.search}%`;
    }

    const where = conditions.join(' AND ');

    const aggregate = await this.purchaseRepo
      .createQueryBuilder('bp')
      .leftJoin('bp.party', 'party')
      .leftJoin('bp.vehicle', 'vehicle')
      .select('COUNT(*)', 'total')
      .addSelect('COALESCE(SUM(bp.total_amount), 0)', 'totalAmount')
      .addSelect('COALESCE(SUM(bp.amount_paid), 0)', 'settled')
      .addSelect('COALESCE(SUM(bp.outstanding_amount), 0)', 'outstanding')
      .where(where, params)
      .getRawOne();
    const total = Number(aggregate?.total ?? 0);
    const summary = {totalAmount: String(aggregate?.totalAmount ?? '0.00'), settled: String(aggregate?.settled ?? '0.00'), outstanding: String(aggregate?.outstanding ?? '0.00')};

    const items = await this.purchaseRepo
      .createQueryBuilder('bp')
      .leftJoinAndSelect('bp.party', 'party')
      .leftJoinAndSelect('bp.vehicle', 'vehicle')
      .where(where, params)
      .orderBy('"bp"."purchase_date"', 'DESC')
      .addOrderBy('bp.id', 'DESC')
      .offset(offset)
      .limit(limit)
      .getMany();

    const totalPages = Math.ceil(total / limit);
    return {
      items,
      summary,
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

  findPurchaseById(id: string): Promise<BrokeragePurchase | null> {
    return this.purchaseRepo
      .createQueryBuilder('bp')
      .leftJoinAndSelect('bp.party', 'party')
      .leftJoinAndSelect('bp.vehicle', 'vehicle')
      .where('bp.id = :id', { id })
      .andWhere('bp.deleted_at IS NULL')
      .getOne();
  }

  async updatePurchase(
    id: string,
    changes: Partial<BrokeragePurchase>,
  ): Promise<BrokeragePurchase> {
    await this.purchaseRepo.update({ id } as never, changes as never);
    return this.findPurchaseById(id) as Promise<BrokeragePurchase>;
  }

  async softDeletePurchase(id: string): Promise<void> {
    await this.purchaseRepo.update(
      { id } as never,
      { deletedAt: new Date() } as never,
    );
  }

  async findAllSalesPaginated(
    query: ListBrokerageSalesQueryDto,
  ): Promise<PaginatedResult<BrokerageSale>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const offset = (page - 1) * limit;

    const status = query.status ?? BrokerageSaleStatus.ACTIVE;
    const params: Record<string, unknown> = { status };
    const conditions: string[] = [
      'bs.deleted_at IS NULL',
      'bs.status = :status',
    ];

    if (query.from) {
      conditions.push('bs.sale_date >= :from');
      params.from = query.from;
    }
    if (query.to) {
      conditions.push('bs.sale_date <= :to');
      params.to = query.to;
    }
    if (query.paymentMethod) {
      conditions.push('bs.payment_method = :pm');
      params.pm = query.paymentMethod;
    }
    if (query.partyId) {
      conditions.push('bs.party_id = :partyId');
      params.partyId = query.partyId;
    }
    if (query.vehicleId) {
      conditions.push('bs.vehicle_id = :vehicleId');
      params.vehicleId = query.vehicleId;
    }
    if (query.search) {
      conditions.push('(party.name ILIKE :search OR vehicle.registration_number ILIKE :search OR bs.description ILIKE :search OR CAST(bs.sale_date AS TEXT) ILIKE :search)');
      params.search = `%${query.search}%`;
    }

    const where = conditions.join(' AND ');

    const aggregate = await this.saleRepo
      .createQueryBuilder('bs')
      .leftJoin('bs.party', 'party')
      .leftJoin('bs.vehicle', 'vehicle')
      .select('COUNT(*)', 'total')
      .addSelect('COALESCE(SUM(bs.total_amount), 0)', 'totalAmount')
      .addSelect('COALESCE(SUM(bs.amount_received), 0)', 'settled')
      .addSelect('COALESCE(SUM(bs.outstanding_amount), 0)', 'outstanding')
      .where(where, params)
      .getRawOne();
    const total = Number(aggregate?.total ?? 0);
    const summary = {totalAmount: String(aggregate?.totalAmount ?? '0.00'), settled: String(aggregate?.settled ?? '0.00'), outstanding: String(aggregate?.outstanding ?? '0.00')};

    const items = await this.saleRepo
      .createQueryBuilder('bs')
      .leftJoinAndSelect('bs.party', 'party')
      .leftJoinAndSelect('bs.vehicle', 'vehicle')
      .where(where, params)
      .orderBy('"bs"."sale_date"', 'DESC')
      .addOrderBy('bs.id', 'DESC')
      .offset(offset)
      .limit(limit)
      .getMany();

    const totalPages = Math.ceil(total / limit);
    return {
      items,
      summary,
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

  findSaleById(id: string): Promise<BrokerageSale | null> {
    return this.saleRepo
      .createQueryBuilder('bs')
      .leftJoinAndSelect('bs.party', 'party')
      .leftJoinAndSelect('bs.vehicle', 'vehicle')
      .where('bs.id = :id', { id })
      .andWhere('bs.deleted_at IS NULL')
      .getOne();
  }

  async updateSale(
    id: string,
    changes: Partial<BrokerageSale>,
  ): Promise<BrokerageSale> {
    await this.saleRepo.update({ id } as never, changes as never);
    return this.findSaleById(id) as Promise<BrokerageSale>;
  }

  async softDeleteSale(id: string): Promise<void> {
    await this.saleRepo.update(
      { id } as never,
      { deletedAt: new Date() } as never,
    );
  }
}
