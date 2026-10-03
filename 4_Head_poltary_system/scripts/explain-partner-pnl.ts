import { DataSource } from 'typeorm';
import { AppDataSource } from '../src/config/data-source';
import { ReportsRepository } from '../src/modules/reports/reports.repository';
import { SupplyRepository } from '../src/modules/supply/supply.repository';

async function main() {
  const db = new DataSource({ ...AppDataSource.options, logging: false });
  await db.initialize();
  try {
    const reports = new ReportsRepository(...[
      'LedgerEntry', 'StockBalance', 'Expense', 'SalaryRun', 'BrokerageSale',
      'SupplySale', 'WastageSale', 'ShopSale', 'InternalTransfer', 'StockMovement', 'Department',
    ].map(name => db.getRepository(name)) as unknown as ConstructorParameters<typeof ReportsRepository>);
    const supply = new SupplyRepository(...['SupplyPurchase', 'SupplySale', 'InternalTransfer', 'Party'].map(name => db.getRepository(name)) as unknown as ConstructorParameters<typeof SupplyRepository>);
    const department = (await reports.getDepartmentProfitLoss(new Date('1970-01-01'), new Date())).find(d => d.departmentType === 'SUPPLY');
    console.log(JSON.stringify({ partnerReport: department, supplyReport: { revenue: await supply.sumActiveSaleTotal(), purchaseTotalUsedAsCogs: await supply.sumActivePurchaseTotal() } }, null, 2));
    if (department) console.log(JSON.stringify(await db.query(`SELECT le.source_type, le.entry_type, SUM(le.amount)::text AS amount FROM ledger_entries le JOIN chart_of_accounts a ON a.id = le.account_id WHERE le.department_id = $1 AND a.code = 'cogs' GROUP BY le.source_type, le.entry_type ORDER BY le.source_type, le.entry_type`, [department.departmentId]), null, 2));
    if (department) console.log(JSON.stringify(await db.query(`WITH costs AS (
      SELECT le.source_id, SUM(CASE WHEN le.entry_type = 'debit' THEN le.amount ELSE -le.amount END) AS amount
      FROM ledger_entries le JOIN chart_of_accounts a ON a.id = le.account_id
      WHERE le.department_id = $1 AND a.code = 'cogs' AND le.source_type = 'purchase' GROUP BY le.source_id
    ) SELECT CASE WHEN p.id IS NULL THEN 'missing_purchase' WHEN p.deleted_at IS NOT NULL THEN 'deleted_purchase' ELSE p.status::text END AS purchase_state,
      COUNT(*) AS source_count, SUM(costs.amount)::text AS ledger_cogs, SUM(p.total_amount)::text AS purchase_totals
      FROM costs LEFT JOIN supply_purchases p ON p.id = costs.source_id GROUP BY purchase_state`, [department.departmentId]), null, 2));
  } finally { await db.destroy(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
