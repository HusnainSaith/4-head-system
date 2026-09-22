import { Injectable } from '@nestjs/common';
import { ReportsRepository } from './reports.repository';

@Injectable()
export class ReportsService {
  constructor(private readonly reportsRepo: ReportsRepository) {}

  private normalizeDate(date?: string, fallback?: Date): Date {
    return date ? new Date(date) : (fallback ?? new Date('1970-01-01'));
  }

  /** Convert an inclusive calendar end date to an exclusive next-day bound. */
  private normalizeEndDate(date?: string): Date {
    if (!date) return new Date();
    const endExclusive = new Date(date);
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
      perPartnerShare: (
        (externalRevenue +
          otherIncome -
          totalCogs -
          totalExpenses -
          totalPayroll) /
        3
      ).toFixed(2),
    };
  }

  async getPartnerProfitShare(from?: string, to?: string) {
    const result = await this.getConsolidatedProfitLoss(from, to);
    return {
      ...result,
      partnerShare: result.perPartnerShare,
    };
  }

  async getDepartmentProfitLoss(from?: string, to?: string) {
    return this.reportsRepo.getDepartmentProfitLoss(
      this.normalizeDate(from, new Date('1970-01-01')),
      this.normalizeEndDate(to),
    );
  }

  async getOutstandingBalances(departmentId?: string) {
    return this.reportsRepo.getOutstandingBalances(departmentId);
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
