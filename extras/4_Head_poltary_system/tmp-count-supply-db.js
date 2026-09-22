const { Client } = require('pg');
require('dotenv').config();

(async () => {
  const c = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 5432),
    user: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_NAME || '4Head_db',
  });
  await c.connect();

  const dept = (
    await c.query("SELECT id, name FROM departments WHERE name = 'Supply' LIMIT 1")
  ).rows[0];
  console.log('SUPPLY_DEPT=' + JSON.stringify(dept));

  const byPrimary = await c.query(
    'SELECT COUNT(*)::int AS n FROM parties WHERE primary_department_id = $1 AND deleted_at IS NULL',
    [dept.id],
  );
  console.log('COUNT_PRIMARY_SUPPLY=' + byPrimary.rows[0].n);

  const appFilter = await c.query(
    `SELECT COUNT(*)::int AS n FROM parties p
     WHERE p.deleted_at IS NULL AND (
       p.primary_department_id = $1
       OR p.linked_department_id = $1
       OR EXISTS (SELECT 1 FROM party_departments pd WHERE pd.party_id = p.id AND pd.department_id = $1)
     )`,
    [dept.id],
  );
  console.log('COUNT_APP_SUPPLY_FILTER=' + appFilter.rows[0].n);

  const rowsAll = await c.query(
    `SELECT p.name, p.party_type, p.opening_balance::text AS ob, p.user_id IS NOT NULL AS has_user
     FROM parties p
     WHERE p.deleted_at IS NULL AND (
       p.primary_department_id = $1
       OR p.linked_department_id = $1
       OR EXISTS (SELECT 1 FROM party_departments pd WHERE pd.party_id = p.id AND pd.department_id = $1)
     )
     ORDER BY p.name ASC`,
    [dept.id],
  );
  console.log('APP_FILTER_TOTAL=' + rowsAll.rows.length);
  for (const r of rowsAll.rows) {
    console.log(r.name + ' | ' + r.party_type + ' | ' + r.ob);
  }
  await c.end();
})().catch((e) => {
  console.error('ERR', e.message);
  process.exit(1);
});