import { strict as assert } from 'node:assert';
import { DataSource } from 'typeorm';
import { AppDataSource } from '../src/config/data-source';
import { ReportsRepository } from '../src/modules/reports/reports.repository';
import { ReportsService } from '../src/modules/reports/reports.service';
import { LedgerEntry } from '../src/modules/ledger/entities/ledger-entry.entity';
import { StockBalance } from '../src/modules/inventory/entities/stock-balance.entity';
import { Expense } from '../src/modules/expenses/entities/expense.entity';
import { SalaryRun } from '../src/modules/employees/entities/salary-run.entity';
import { BrokerageSale } from '../src/modules/brokerage/entities/brokerage-sale.entity';
import { SupplySale } from '../src/modules/supply/entities/supply-sale.entity';
import { WastageSale } from '../src/modules/wastage/entities/wastage-sale.entity';
import { ShopSale } from '../src/modules/fresh-chicken-shop/entities/shop-sale.entity';
import { InternalTransfer } from '../src/modules/supply/entities/internal-transfer.entity';
import { StockMovement } from '../src/modules/inventory/entities/stock-movement.entity';
import { Department } from '../src/modules/departments/entities/department.entity';
import { User } from '../src/modules/users/entities/user.entity';
import { moneyToCents } from '../src/common/utils/money.util';

/** Exercise real SQL and account writes inside an outer transaction that always rolls back. */
async function main() {
  const departmentId = process.argv[2];
  assert(departmentId, 'Pass a department UUID containing partner users');
  const dataSource = new DataSource({
    ...AppDataSource.options,
    logging: false,
  });
  await dataSource.initialize();
  const runner = dataSource.createQueryRunner();
  try {
    await runner.connect();
    await runner.startTransaction();
    await runner.query("SET LOCAL lock_timeout = '5s'");
    await runner.query("SET LOCAL statement_timeout = '30s'");
    const manager = runner.manager;
    const repository = new ReportsRepository(
      manager.getRepository(LedgerEntry),
      manager.getRepository(StockBalance),
      manager.getRepository(Expense),
      manager.getRepository(SalaryRun),
      manager.getRepository(BrokerageSale),
      manager.getRepository(SupplySale),
      manager.getRepository(WastageSale),
      manager.getRepository(ShopSale),
      manager.getRepository(InternalTransfer),
      manager.getRepository(StockMovement),
      manager.getRepository(Department),
    );
    const partners = (await repository.getDepartmentPartners()).filter(
      (p) => p.departmentId === departmentId,
    );
    assert(partners.length > 0, 'Department must have partners');
    const actor = await manager
      .getRepository(User)
      .createQueryBuilder('actor')
      .innerJoin('actor.role', 'role')
      .where("LOWER(role.name) = 'owner'")
      .getOneOrFail();
    const reports = new ReportsService(repository);
    for (const allocationMode of ['equal', 'percentage'] as const) {
      await repository.savePartnerShares(
        departmentId,
        {
          allocationMode,
          shares: partners.map((p, i) => ({
            userId: p.userId,
            ...(allocationMode === 'percentage'
              ? { percentage: i === 0 ? '100' : '0' }
              : {}),
          })),
        },
        actor.id,
      );
      const report = await reports.getPartnerProfitShare();
      const department = report.departments.find(
        (d) => d.departmentId === departmentId,
      )!;
      assert(department.configured);
      assert.equal(department.allocationMode, allocationMode);
      assert.equal(department.partners.length, partners.length);
      assert.equal(
        department.partners.reduce(
          (sum, p) => sum + moneyToCents(p.profitShare),
          0n,
        ),
        moneyToCents(department.netProfit),
      );
      if (allocationMode === 'equal') {
        const amounts = department.partners
          .map((p) => moneyToCents(p.profitShare))
          .sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
        assert(amounts.at(-1)! - amounts[0] <= 1n);
      }
      console.log(
        `${allocationMode}: save, linked accounts, and profit allocation verified (${partners.length} partners).`,
      );
    }
  } finally {
    if (runner.isTransactionActive) await runner.rollbackTransaction();
    await runner.release();
    await dataSource.destroy();
  }
  console.log('Verification complete; all verification writes rolled back.');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
