import { BadRequestException, Injectable } from '@nestjs/common';
import { ReportsRepository } from './reports.repository';
import {
  centsToMoney,
  moneyToCents,
  percentToUnits,
} from '../../common/utils/money.util';
import { PartnerSharesDto } from './dto/partner-shares.dto';
import { PostPartnerProfitDto } from './dto/post-partner-profit.dto';

@Injectable()
export class ReportsService {
  constructor(private readonly reportsRepo: ReportsRepository) {}

  private normalizeDate(date?: string, fallback?: Date): Date {
    return date ? new Date(date) : (fallback ?? new Date('1970-01-01'));
  }

  /** Convert an inclusive calendar end date to an exclusive next-day bound. */
  private normalizeEndDate(date?: string): Date {
    const endExclusive = new Date(
      date ?? new Date().toISOString().slice(0, 10),
    );
    endExclusive.setUTCDate(endExclusive.getUTCDate() + 1);
    return endExclusive;
  }

  async getConsolidatedProfitLoss(from?: string, to?: string) {
    const start = this.normalizeDate(from, new Date('1970-01-01'));
    const end = this.normalizeEndDate(to);

    const externalRevenue = await this.reportsRepo.sumExternalSales(start, end);
    const internalRev = await this.reportsRepo.sumInternalTransferRevenue(
      start,
      end,
    );
    const otherIncome = await this.reportsRepo.sumLedgerAccount(
      null,
      ['other_income'],
      'credit',
      start,
      end,
    );

    const totalCogs = await this.reportsRepo.sumLedgerAccount(
      null,
      ['cogs'],
      'debit',
      start,
      end,
      'internal_transfer',
    );
    const totalExpenses = await this.reportsRepo.sumLedgerAccount(
      null,
      ['operating_expense'],
      'debit',
      start,
      end,
    );
    const totalPayroll = await this.reportsRepo.sumLedgerAccount(
      null,
      ['payroll_expense'],
      'debit',
      start,
      end,
    );

    return {
      externalRevenue: externalRevenue.toFixed(2),
      internalTransferRevenue: internalRev.toFixed(2), // display only
      otherIncome: otherIncome.toFixed(2),
      totalCogs: totalCogs.toFixed(2),
      totalExpenses: totalExpenses.toFixed(2),
      totalPayroll: totalPayroll.toFixed(2),
      netProfit: (
        externalRevenue +
        otherIncome -
        totalCogs -
        totalExpenses -
        totalPayroll
      ).toFixed(2),
    };
  }

  savePartnerShares(
    departmentId: string,
    dto: PartnerSharesDto,
    actorId: string,
  ) {
    return this.reportsRepo.savePartnerShares(departmentId, dto, actorId);
  }

  async postPartnerProfit(
    departmentId: string,
    dto: PostPartnerProfitDto,
    actorId: string,
  ) {
    // Validate dates before acquiring database locks.
    await this.getPartnerProfitShare(dto.startDate, dto.endDate);
    const normalized = {
      ...dto,
      startDate: dto.startDate ?? '1970-01-01',
      endDate: dto.endDate ?? new Date().toISOString().slice(0, 10),
    };
    return this.reportsRepo.postPartnerProfit(
      departmentId,
      normalized,
      actorId,
      async (repository) =>
        (
          await new ReportsService(repository).getPartnerProfitShare(
            normalized.startDate,
            normalized.endDate,
          )
        ).departments.find(
          (department) => department.departmentId === departmentId,
        ),
    );
  }

  async getPartnerAccruals(_from?: string, _to?: string, _partyIds?: string[]) {
    // Actual balances contain only confirmed postings. Previews must not be
    // added to the ledger again when accounts or statements are read.
    return [] as {
      partyId: string;
      departmentId: string;
      departmentName: string;
      userId: string;
      partnerName: string;
      partyType?: string;
      profitShare: string;
      ownershipLabel: string;
    }[];
  }

  async getPartnerProfitShare(from?: string, to?: string) {
    for (const date of [from, to]) {
      if (
        date !== undefined &&
        (!/^\d{4}-\d{2}-\d{2}$/.test(date) ||
          !Number.isFinite(Date.parse(date)) ||
          new Date(date).toISOString().slice(0, 10) !== date)
      )
        throw new BadRequestException(
          'Dates must be valid YYYY-MM-DD calendar dates',
        );
    }
    if (from && to && from > to)
      throw new BadRequestException('Start date must not be after end date');
    const [departments, partners] = await Promise.all([
      this.reportsRepo.getDepartmentProfitLoss(
        this.normalizeDate(from),
        this.normalizeEndDate(to),
        true,
      ),
      this.reportsRepo.getDepartmentPartners(),
    ]);
    const byDepartment = new Map<string, typeof partners>();
    for (const partner of partners) {
      const members = byDepartment.get(partner.departmentId) ?? [];
      members.push(partner);
      byDepartment.set(partner.departmentId, members);
    }
    let total = 0n;
    let unallocated = 0n;
    const breakdown = departments.map((department) => {
      const members = byDepartment.get(department.departmentId) ?? [];
      const amount = moneyToCents(department.netProfit);
      total += amount;
      const equalShare =
        members.length > 0 && members.every((p) => p.equalShare === true);
      const configured =
        members.length > 0 &&
        members.every((p) => p.percentage !== null && p.partyId) &&
        (equalShare ||
          (members.every((p) => !p.equalShare) &&
            members.reduce(
              (sum, p) => sum + percentToUnits(p.percentage ?? '0'),
              0n,
            ) === 1000000n));
      if (!configured) unallocated += amount;
      const absolute = amount < 0n ? -amount : amount;
      const direction = amount < 0n ? -1n : 1n;
      const denominator = equalShare ? BigInt(members.length) : 1000000n;
      const allocations = members.map((partner) => {
        const numerator =
          absolute *
          (equalShare ? 1n : percentToUnits(partner.percentage ?? '0'));
        return {
          partner,
          cents: numerator / denominator,
          remainder: numerator % denominator,
        };
      });
      if (configured) {
        let remaining =
          absolute - allocations.reduce((sum, a) => sum + a.cents, 0n);
        const ranked = [...allocations].sort((a, b) =>
          a.remainder === b.remainder
            ? a.partner.userId.localeCompare(b.partner.userId)
            : a.remainder > b.remainder
              ? -1
              : 1,
        );
        for (const allocation of ranked) {
          if (remaining <= 0n) break;
          allocation.cents += 1n;
          remaining -= 1n;
        }
      }
      return {
        ...department,
        configured,
        allocationMode: equalShare
          ? ('equal' as const)
          : ('percentage' as const),
        unallocatedProfit: configured ? '0.00' : department.netProfit,
        partners: allocations.map(({ partner, cents }) => ({
          ...partner,
          ownershipLabel: equalShare
            ? `1/${members.length} (equal share)`
            : `${partner.percentage ?? '0'}%`,
          profitShare: centsToMoney(configured ? cents * direction : 0n),
        })),
      };
    });
    return {
      netProfit: centsToMoney(total),
      allocatedProfit: centsToMoney(total - unallocated),
      unallocatedProfit: centsToMoney(unallocated),
      departments: breakdown,
    };
  }

  async getDepartmentProfitLoss(from?: string, to?: string) {
    return this.reportsRepo.getDepartmentProfitLoss(
      this.normalizeDate(from, new Date('1970-01-01')),
      this.normalizeEndDate(to),
    );
  }

  async getOutstandingBalances(departmentId?: string) {
    const [rows, partners] = await Promise.all([
      this.reportsRepo.getOutstandingBalances(departmentId),
      this.getPartnerAccruals(),
    ]);
    for (const partner of partners) {
      if (departmentId && partner.departmentId !== departmentId) continue;
      let row = rows.find(
        (r) =>
          r.partyId === partner.partyId &&
          r.departmentId === partner.departmentId,
      );
      if (!row) {
        row = {
          partyId: partner.partyId,
          partyName: partner.partnerName,
          partyType: partner.partyType ?? 'partner',
          departmentId: partner.departmentId,
          departmentName: partner.departmentName,
          balance: '0.00',
        };
        rows.push(row);
      }
      row.balance = centsToMoney(
        moneyToCents(Number(row.balance).toFixed(2)) +
          moneyToCents(partner.profitShare),
      );
    }
    return rows.filter(
      (r) => moneyToCents(Number(r.balance).toFixed(2)) !== 0n,
    );
  }

  async getStockSummary(departmentId?: string, from?: string, to?: string) {
    return this.reportsRepo.getStockSummary(
      departmentId,
      this.normalizeDate(from, new Date('1970-01-01')),
      this.normalizeEndDate(to),
    );
  }

  async getExpenseBreakdown(
    from?: string,
    to?: string,
    departmentId?: string,
    categoryId?: string,
  ) {
    const start = this.normalizeDate(from, new Date('1970-01-01'));
    const end = this.normalizeEndDate(to);
    return this.reportsRepo.getExpenseBreakdown(
      start,
      end,
      departmentId,
      categoryId,
    );
  }

  async getPayrollSummary(from?: string, to?: string, departmentId?: string) {
    const start = this.normalizeDate(from, new Date('1970-01-01'));
    const end = this.normalizeEndDate(to);
    return this.reportsRepo.getPayrollSummary(start, end, departmentId);
  }
}
