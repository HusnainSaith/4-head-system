import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DataSource, EntityManager, In, IsNull } from 'typeorm';
import { LedgerService } from '../ledger/ledger.service';
import { Committee } from './entities/committee.entity';
import { CommitteeInstallment } from './entities/committee-installment.entity';
import { CommitteePayout } from './entities/committee-payout.entity';
import {
  CreateCommitteeDto,
  CreateInstallmentDto,
  CreatePayoutDto,
  UpdateCommitteeDto,
} from './dto/committee.dto';

@Injectable()
export class CommitteesService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly ledger: LedgerService,
  ) {}

  async list(departmentId?: string) {
    const committees = await this.dataSource.getRepository(Committee).find({
      where: {
        ...(departmentId ? { departmentId } : {}),
        deletedAt: null as any,
      },
      order: { startDate: 'DESC' },
    });
    if (committees.length === 0) return [];

    const committeeIds = committees.map(({ id }) => id);
    const [installmentTotals, payoutTotals] = await Promise.all([
      this.dataSource
        .getRepository(CommitteeInstallment)
        .createQueryBuilder('installment')
        .select('installment.committeeId', 'committeeId')
        .addSelect('COUNT(installment.id)', 'installmentCount')
        .addSelect('COALESCE(SUM(installment.amount), 0)', 'totalContributed')
        .where({ committeeId: In(committeeIds), deletedAt: IsNull() })
        .groupBy('installment.committeeId')
        .getRawMany(),
      this.dataSource
        .getRepository(CommitteePayout)
        .createQueryBuilder('payout')
        .select('payout.committeeId', 'committeeId')
        .addSelect('COALESCE(SUM(payout.payoutAmount), 0)', 'totalPayout')
        .where({ committeeId: In(committeeIds), deletedAt: IsNull() })
        .groupBy('payout.committeeId')
        .getRawMany(),
    ]);
    const installmentsByCommittee = new Map(
      installmentTotals.map((row) => [row.committeeId, row]),
    );
    const payoutsByCommittee = new Map(
      payoutTotals.map((row) => [row.committeeId, row]),
    );

    return committees.map((committee) => {
      const installment = installmentsByCommittee.get(committee.id);
      const installmentCount = Number(installment?.installmentCount ?? 0);
      const totalContributed = Number(installment?.totalContributed ?? 0);
      const totalPayout = Number(
        payoutsByCommittee.get(committee.id)?.totalPayout ?? 0,
      );
      return {
        ...committee,
        installmentCount,
        remainingInstallments: Math.max(
          committee.totalMembers - installmentCount,
          0,
        ),
        totalContributed: totalContributed.toFixed(2),
        totalPayout: totalPayout.toFixed(2),
        // Payments leave Cash/Bank; a payout enters Cash/Bank.
        currentAmount: (totalPayout - totalContributed).toFixed(2),
      };
    });
  }

  async findOne(id: string, manager?: EntityManager) {
    const repo = (manager ?? this.dataSource.manager).getRepository(Committee);
    const item = await repo.findOne({ where: { id, deletedAt: null as any } });
    if (!item) throw new NotFoundException('Committee not found');
    return item;
  }

  create(dto: CreateCommitteeDto, actorId: string) {
    if (dto.payoutPosition > dto.totalMembers)
      throw new BadRequestException(
        'Payout position cannot exceed total members',
      );
    const repo = this.dataSource.getRepository(Committee);
    return repo.save(
      repo.create({
        ...dto,
        installmentAmount: dto.installmentAmount.toFixed(2),
        createdBy: actorId,
        updatedBy: actorId,
      }),
    );
  }

  async update(id: string, dto: UpdateCommitteeDto, actorId: string) {
    return this.dataSource.transaction(async (manager) => {
      const committee = await this.findOne(id, manager);
      const count = await manager
        .getRepository(CommitteeInstallment)
        .count({ where: { committeeId: id, deletedAt: null as any } });
      if (count)
        throw new ConflictException(
          'Committee cannot be edited after installments exist',
        );
      Object.assign(
        committee,
        dto,
        dto.installmentAmount === undefined
          ? {}
          : { installmentAmount: dto.installmentAmount.toFixed(2) },
        { updatedBy: actorId },
      );
      if (committee.payoutPosition > committee.totalMembers)
        throw new BadRequestException(
          'Payout position cannot exceed total members',
        );
      return manager.save(Committee, committee);
    });
  }

  installments(id: string) {
    return this.dataSource.getRepository(CommitteeInstallment).find({
      where: { committeeId: id, deletedAt: null as any },
      order: { installmentDate: 'ASC' },
    });
  }

  recordInstallment(id: string, dto: CreateInstallmentDto, actorId: string) {
    return this.dataSource.transaction(async (manager) => {
      const committee = await this.findOne(id, manager);
      if (committee.status !== 'active')
        throw new ConflictException('Committee is not active');
      const repo = manager.getRepository(CommitteeInstallment);
      const installmentCount = await repo.count({
        where: { committeeId: id, deletedAt: null as any },
      });
      if (installmentCount >= committee.totalMembers)
        throw new ConflictException(
          'All committee installments have already been recorded',
        );
      if (
        Math.round(dto.amount * 100) !==
        Math.round(Number(committee.installmentAmount) * 100)
      ) {
        throw new BadRequestException(
          'Installment amount must match the committee installment amount',
        );
      }
      const saved = await repo.save(
        repo.create({
          committeeId: id,
          amount: dto.amount.toFixed(2),
          installmentDate: dto.installmentDate,
          createdBy: actorId,
          updatedBy: actorId,
        }),
      );
      await this.ledger.post(
        [
          {
            departmentId: committee.departmentId,
            accountCode: 'committee_advance',
            entryType: 'debit',
            amount: saved.amount,
            entryDate: new Date(dto.installmentDate),
            sourceType: 'committee',
            sourceId: saved.id,
            createdBy: actorId,
          },
          {
            departmentId: committee.departmentId,
            accountCode: dto.paymentMethod,
            entryType: 'credit',
            amount: saved.amount,
            entryDate: new Date(dto.installmentDate),
            sourceType: 'committee',
            sourceId: saved.id,
            createdBy: actorId,
          },
        ],
        manager,
      );
      return saved;
    });
  }

  recordPayout(id: string, dto: CreatePayoutDto, actorId: string) {
    return this.dataSource.transaction(async (manager) => {
      const committee = await this.findOne(id, manager);
      if (committee.status !== 'active')
        throw new ConflictException('Committee is not active');
      const payoutRepo = manager.getRepository(CommitteePayout);
      if (await payoutRepo.exist({ where: { committeeId: id } }))
        throw new ConflictException('Committee payout already exists');
      const raw = await manager
        .getRepository(CommitteeInstallment)
        .createQueryBuilder('i')
        .select('COALESCE(SUM(i.amount), 0)', 'total')
        .where('i.committeeId = :id', { id })
        .andWhere('i.deletedAt IS NULL')
        .getRawOne();
      const contributed = Number(raw.total);
      if (
        dto.totalContributed !== undefined &&
        Math.round(dto.totalContributed * 100) !== Math.round(contributed * 100)
      )
        throw new BadRequestException(
          'Submitted contribution total does not match recorded installments',
        );
      if (dto.payoutAmount < contributed)
        throw new BadRequestException(
          'Payout cannot be less than total contributed',
        );
      const excess = dto.payoutAmount - contributed;
      const saved = await payoutRepo.save(
        payoutRepo.create({
          committeeId: id,
          payoutAmount: dto.payoutAmount.toFixed(2),
          totalContributed: contributed.toFixed(2),
          excessAmount: excess.toFixed(2),
          payoutDate: dto.payoutDate,
          createdBy: actorId,
          updatedBy: actorId,
        }),
      );
      await this.ledger.post(
        [
          {
            departmentId: committee.departmentId,
            accountCode: dto.paymentMethod,
            entryType: 'debit',
            amount: saved.payoutAmount,
            entryDate: new Date(dto.payoutDate),
            sourceType: 'committee',
            sourceId: saved.id,
            createdBy: actorId,
          },
          {
            departmentId: committee.departmentId,
            accountCode: 'committee_advance',
            entryType: 'credit',
            amount: saved.totalContributed,
            entryDate: new Date(dto.payoutDate),
            sourceType: 'committee',
            sourceId: saved.id,
            createdBy: actorId,
          },
          ...(excess > 0
            ? [
                {
                  departmentId: committee.departmentId,
                  accountCode: 'other_income',
                  entryType: 'credit' as const,
                  amount: excess.toFixed(2),
                  entryDate: new Date(dto.payoutDate),
                  sourceType: 'committee',
                  sourceId: saved.id,
                  createdBy: actorId,
                },
              ]
            : []),
        ],
        manager,
      );
      committee.status = 'completed';
      committee.updatedBy = actorId;
      await manager.save(Committee, committee);
      return saved;
    });
  }

  async positionReport(departmentId?: string) {
    const committees = await this.list(departmentId);
    return committees.map((committee) => {
      const expected = new Date(`${committee.startDate}T00:00:00Z`);
      expected.setUTCMonth(
        expected.getUTCMonth() + committee.payoutPosition - 1,
      );
      return {
        ...committee,
        expectedPayoutDate: expected.toISOString().slice(0, 10),
      };
    });
  }
}
