const { Client } = require('pg');
require('dotenv').config({ quiet: true });
async function main() {
  const client = new Client({ host: process.env.DB_HOST, port: Number(process.env.DB_PORT || 5432), user: process.env.DB_USERNAME, password: process.env.DB_PASSWORD, database: process.env.DB_DATABASE || process.env.DB_NAME });
  await client.connect();
  try {
    const { rows: [dept] } = await client.query("SELECT id FROM departments WHERE type = 'SUPPLY'");
    for (const [label, sql] of [
      ['document totals', "SELECT 'purchase' AS kind, purchase_date AS date, count(*), sum(quantity_kg) AS quantity FROM supply_purchases WHERE department_id=$1 AND deleted_at IS NULL AND status='posted' GROUP BY purchase_date UNION ALL SELECT 'sale', sale_date, count(*), sum(quantity_kg) FROM supply_sales WHERE department_id=$1 AND deleted_at IS NULL AND status='posted' GROUP BY sale_date UNION ALL SELECT 'writeoff', writeoff_date, count(*), sum(quantity_kg) FROM stock_writeoffs WHERE department_id=$1 AND deleted_at IS NULL GROUP BY writeoff_date ORDER BY date, kind"],
      ['purchases', "SELECT id, purchase_date, quantity_kg, rate_per_kg, status, deleted_at FROM supply_purchases WHERE department_id=$1 AND purchase_date='2026-09-21' ORDER BY created_at"],
      ['sales', "SELECT id, sale_date, quantity_kg, rate_per_kg, status, deleted_at FROM supply_sales WHERE department_id=$1 AND sale_date='2026-09-21' ORDER BY created_at"],
      ['daily movements', "SELECT movement_date, movement_type, stock_type, count(*), sum(quantity_kg) AS quantity FROM stock_movements WHERE department_id=$1 GROUP BY 1,2,3 ORDER BY 1,2,3"],
      ['movement balance', "SELECT stock_type, SUM(CASE WHEN movement_type IN ('purchase_in','transfer_in','opening_stock','dressing_in') THEN quantity_kg ELSE -quantity_kg END) AS quantity FROM stock_movements WHERE department_id=$1 GROUP BY stock_type"],
      ['recent movements', "SELECT * FROM stock_movements WHERE department_id=$1 ORDER BY created_at DESC LIMIT 8"],
    ]) console.log(label, JSON.stringify((await client.query(sql, [dept.id])).rows, null, 2));
  } finally { await client.end(); }
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
