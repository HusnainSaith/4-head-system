import 'reflect-metadata';
import { AppDataSource } from '../src/config/data-source';

const tables = [
  'departments', 'users', 'parties', 'employees', 'vehicles', 'expenses',
  'brokerage_purchases', 'brokerage_sales', 'supply_purchases', 'supply_sales',
  'wastage_purchases', 'wastage_sales', 'shop_sales', 'ledger_entries',
  'committees', 'committee_installments', 'committee_payouts',
  'expense_allocations', 'expense_allocation_splits',
];

async function main() {
  await AppDataSource.initialize();
  const q = AppDataSource.createQueryRunner();
  const snapshot: Record<string, number> = {};
  for (const table of tables) {
    const [{ count }] = await q.query(`SELECT count(*)::int AS count FROM "${table}"`);
    snapshot[table] = count;
  }
  console.log('ROW_COUNTS\n' + JSON.stringify(snapshot, null, 2));

  const departments = await q.query(`SELECT id, name, type FROM departments ORDER BY name`);
  const qaUsers = await q.query(`SELECT u.email, r.name AS role, d.name AS department FROM users u JOIN roles r ON r.id=u.role_id LEFT JOIN departments d ON d.id=u.department_id WHERE u.email LIKE 'qa.%@poultry.local' ORDER BY u.email`);
  console.log('DEPARTMENTS\n' + JSON.stringify(departments, null, 2));
  console.log('QA_USERS\n' + JSON.stringify(qaUsers, null, 2));

  await q.startTransaction();
  try {
    const columns: Array<{ column_name: string }> = await q.query(`SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name='supply_purchases' ORDER BY ordinal_position`);
    const expressions = columns.map(({ column_name }) => column_name === 'id' ? 'gen_random_uuid()' : column_name === 'quantity_kg' ? '-1::numeric' : `"${column_name}"`).join(', ');
    await q.query(`INSERT INTO supply_purchases SELECT ${expressions} FROM supply_purchases LIMIT 1`);
    console.log('NEGATIVE_INSERT unexpected success');
  } catch (error: any) {
    console.log('NEGATIVE_INSERT_REJECTED\n' + String(error.message));
  } finally {
    await q.rollbackTransaction();
  }

  await q.startTransaction();
  try {
    const [referenced] = await q.query(`SELECT p.id FROM parties p JOIN supply_purchases sp ON sp.party_id=p.id LIMIT 1`);
    if (!referenced) console.log('FK_RESTRICT not verifiable: no referenced Supply party');
    else {
      await q.query('DELETE FROM parties WHERE id=$1', [referenced.id]);
      console.log('FK_RESTRICT unexpected delete success');
    }
  } catch (error: any) {
    console.log('FK_RESTRICT_REJECTED\n' + String(error.message));
  } finally {
    await q.rollbackTransaction();
  }

  const imbalances = await q.query(`SELECT source_type, source_id, SUM(CASE WHEN entry_type='debit' THEN amount ELSE 0 END)::numeric AS debit, SUM(CASE WHEN entry_type='credit' THEN amount ELSE 0 END)::numeric AS credit FROM ledger_entries GROUP BY source_type, source_id HAVING SUM(CASE WHEN entry_type='debit' THEN amount ELSE 0 END) <> SUM(CASE WHEN entry_type='credit' THEN amount ELSE 0 END)`);
  console.log('LEDGER_IMBALANCES\n' + JSON.stringify(imbalances, null, 2));
  await q.release();
  await AppDataSource.destroy();
}

main().catch(error => { console.error(error); process.exitCode = 1; });
