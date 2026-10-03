// Targeted repair of the audited balance. Dry-run unless --apply is supplied.
const { Client } = require('pg');
const fs = require('node:fs');
const path = require('node:path');
require('dotenv').config({ quiet: true });
async function main() {
  const client = new Client({ host: process.env.DB_HOST, port: Number(process.env.DB_PORT || 5432), user: process.env.DB_USERNAME, password: process.env.DB_PASSWORD, database: process.env.DB_DATABASE || process.env.DB_NAME });
  await client.connect();
  try {
    await client.query('BEGIN');
    await client.query('LOCK TABLE stock_balances, stock_movements, supply_purchases, supply_sales, stock_writeoffs, internal_transfers IN SHARE ROW EXCLUSIVE MODE');
    const { rows: [dept] } = await client.query("SELECT id FROM departments WHERE type='SUPPLY'");
    const { rows: transfers } = await client.query('SELECT id FROM internal_transfers WHERE deleted_at IS NULL AND (from_department_id=$1 OR to_department_id=$1)', [dept.id]);
    const { rows: other } = await client.query("SELECT id FROM stock_movements WHERE department_id=$1 AND source_type NOT IN ('purchase','sale','stock_writeoff')", [dept.id]);
    if (transfers.length || other.length) throw new Error('Additional stock sources require review; no repair applied.');
    const { rows: days } = await client.query(`
      SELECT day::text, SUM(purchased) AS purchased, SUM(sold) AS sold, SUM(shrinkage) AS shrinkage,
        SUM(purchased-sold-shrinkage) AS remaining FROM (
        SELECT purchase_date AS day, quantity_kg AS purchased, 0::numeric AS sold, 0::numeric AS shrinkage
          FROM supply_purchases WHERE department_id=$1 AND deleted_at IS NULL AND status='posted'
        UNION ALL SELECT sale_date, 0, quantity_kg, 0 FROM supply_sales WHERE department_id=$1 AND deleted_at IS NULL AND status='posted'
        UNION ALL SELECT writeoff_date, 0, 0, quantity_kg FROM stock_writeoffs WHERE department_id=$1 AND deleted_at IS NULL
      ) documents GROUP BY day ORDER BY day`, [dept.id]);
    const target = days.find(day => day.day === '2026-09-21');
    if (!target || Number(target.purchased) !== 5066 || Number(target.sold) !== 4943.7 || Number(target.shrinkage) !== 0 || days.some(day => day.day !== '2026-09-21' && Number(day.remaining) !== 0)) throw new Error('Records differ from the audit; no repair applied.');
    const { rows: purchases } = await client.query("SELECT rate_per_kg FROM supply_purchases WHERE department_id=$1 AND purchase_date='2026-09-21' AND deleted_at IS NULL AND status='posted'", [dept.id]);
    if (purchases.length !== 1) throw new Error('Purchase costing requires review.');
    const { rows: before } = await client.query("SELECT * FROM stock_balances WHERE department_id=$1 AND stock_type='standard' FOR UPDATE", [dept.id]);
    if (before.length !== 1) throw new Error('Expected one existing supply balance.');
    const result = { before, dailyReconciliation: days, quantityKg: Number(target.remaining).toFixed(3), wac: Number(purchases[0].rate_per_kg).toFixed(4) };
    if (process.argv.includes('--apply')) {
      const backup = path.resolve('../database-backups', `supply-stock-repair-${Date.now()}.json`);
      fs.writeFileSync(backup, JSON.stringify(result, null, 2), { flag: 'wx' });
      await client.query('UPDATE stock_balances SET quantity_kg=$1, wac=$2, updated_at=now() WHERE id=$3', [result.quantityKg, result.wac, before[0].id]);
      await client.query('COMMIT');
      console.log(JSON.stringify({ applied: true, backup, quantityKg: result.quantityKg, wac: result.wac }));
    } else {
      await client.query('ROLLBACK');
      console.log(JSON.stringify(result, null, 2));
    }
  } catch (error) { await client.query('ROLLBACK'); throw error; }
  finally { await client.end(); }
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
