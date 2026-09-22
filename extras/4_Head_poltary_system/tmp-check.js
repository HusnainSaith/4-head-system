require('dotenv').config();
const { Client } = require('pg');
(async () => {
  const c = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 5432),
    user: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_NAME || '4Head_db',
  });
  await c.connect();
  const dept = (await c.query("SELECT id, name FROM departments WHERE name = 'Supply' LIMIT 1")).rows[0];
  if (!dept) {
    console.log('NO_SUPPLY_DEPT');
    process.exit(1);
  }
  const rows = await c.query(
    "SELECT name, opening_balance FROM parties WHERE primary_department_id = $1 ORDER BY name ASC",
    [dept.id],
  );
  console.log('COUNT=' + rows.rows.length);
  console.log(rows.rows.slice(0, 12).map(r => r.name + ':' + r.opening_balance).join('\n'));
  const joinRows = await c.query(
    "SELECT COUNT(*) AS c FROM party_departments WHERE department_id = $1",
    [dept.id],
  );
  console.log('JOIN_COUNT=' + joinRows.rows[0].c);
  await c.end();
})();
