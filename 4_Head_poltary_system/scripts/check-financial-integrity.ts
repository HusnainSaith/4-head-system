import { AppDataSource } from '../src/config/data-source';

const checks: Array<[string, string]> = [
  ['brokerage_purchases', 'quantity_kg > 0 AND rate_per_kg > 0 AND total_amount > 0 AND amount_paid >= 0 AND amount_paid <= total_amount'],
  ['brokerage_sales', 'quantity_kg > 0 AND rate_per_kg > 0 AND total_amount > 0 AND amount_received >= 0 AND amount_received <= total_amount'],
  ['supply_purchases', 'quantity_kg > 0 AND rate_per_kg > 0 AND total_amount > 0 AND amount_paid >= 0 AND amount_paid <= total_amount'],
  ['supply_sales', 'quantity_kg > 0 AND rate_per_kg > 0 AND total_amount > 0 AND amount_received >= 0 AND amount_received <= total_amount'],
  ['wastage_purchases', 'quantity_kg > 0 AND rate_per_kg > 0 AND total_amount > 0 AND amount_paid >= 0 AND amount_paid <= total_amount'],
  ['wastage_sales', 'quantity_kg > 0 AND rate_per_kg > 0 AND total_amount > 0 AND amount_received >= 0 AND amount_received <= total_amount'],
  ['shop_sales', 'quantity_kg > 0 AND rate_per_kg > 0 AND total_amount > 0 AND amount_received >= 0 AND amount_received <= total_amount'],
  ['internal_transfers', 'quantity_kg > 0 AND internal_rate_per_kg > 0 AND total_amount > 0 AND amount_settled >= 0 AND amount_settled <= total_amount'],
  ['stock_writeoffs', 'quantity_kg > 0 AND valuation_amount >= 0'],
  ['stock_movements', 'quantity_kg > 0 AND rate_per_kg >= 0'],
  ['party_payments', 'amount > 0'],
  ['expenses', 'amount > 0'],
];

async function main() {
  await AppDataSource.initialize();
  try {
    for (const [table, condition] of checks) {
      const [{ count }] = await AppDataSource.query(`SELECT count(*)::int AS count FROM "${table}" WHERE NOT (${condition})`);
      console.log(`${table}: ${count} violating row(s)`);
    }
  } finally {
    await AppDataSource.destroy();
  }
}
main().catch(error => { console.error(error instanceof Error ? error.message : error); process.exitCode = 1; });
