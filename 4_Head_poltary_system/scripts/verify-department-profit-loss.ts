import { AppDataSource } from '../src/config/data-source';
import { BrokerageSale } from '../src/modules/brokerage/entities/brokerage-sale.entity';
import { Department } from '../src/modules/departments/entities/department.entity';
import { Expense } from '../src/modules/expenses/entities/expense.entity';
import { SalaryRun } from '../src/modules/employees/entities/salary-run.entity';
import { ShopSale } from '../src/modules/fresh-chicken-shop/entities/shop-sale.entity';
import { StockBalance } from '../src/modules/inventory/entities/stock-balance.entity';
import { StockMovement } from '../src/modules/inventory/entities/stock-movement.entity';
import { LedgerEntry } from '../src/modules/ledger/entities/ledger-entry.entity';
import { ReportsRepository } from '../src/modules/reports/reports.repository';
import { InternalTransfer } from '../src/modules/supply/entities/internal-transfer.entity';
import { SupplySale } from '../src/modules/supply/entities/supply-sale.entity';
import { WastageSale } from '../src/modules/wastage/entities/wastage-sale.entity';

async function main() {
  await AppDataSource.initialize();
  try {
    const repository = new ReportsRepository(
      AppDataSource.getRepository(LedgerEntry),
      AppDataSource.getRepository(StockBalance),
      AppDataSource.getRepository(Expense),
      AppDataSource.getRepository(SalaryRun),
      AppDataSource.getRepository(BrokerageSale),
      AppDataSource.getRepository(SupplySale),
      AppDataSource.getRepository(WastageSale),
      AppDataSource.getRepository(ShopSale),
      AppDataSource.getRepository(InternalTransfer),
      AppDataSource.getRepository(StockMovement),
      AppDataSource.getRepository(Department),
    );
    const rows = await repository.getDepartmentProfitLoss(
      new Date('1970-01-01T00:00:00.000Z'),
      new Date(),
    );
    for (const row of rows) {
      const expectedNet = (
        Number(row.grossProfit) -
        Number(row.operatingExpenses) -
        Number(row.payrollExpenses)
      ).toFixed(2);
      if (row.netProfit !== expectedNet) {
        throw new Error(`${row.departmentName}: net profit does not reconcile`);
      }
    }
    console.table(rows);
  } finally {
    await AppDataSource.destroy();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
