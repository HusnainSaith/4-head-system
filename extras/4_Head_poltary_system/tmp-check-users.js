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
  const r = await c.query(
    "SELECT u.email, u.full_name, p.name AS party_name FROM users u LEFT JOIN parties p ON p.user_id = u.id WHERE u.email LIKE 'supply-%' ORDER BY u.email",
  );
  let mism = 0;
  for (const x of r.rows) {
    if (x.party_name && x.full_name !== x.party_name) {
      mism++;
      console.log(
        x.email +
          '  user_fullName=[' +
          x.full_name +
          ']  party_name=[' +
          x.party_name +
          ']',
      );
    }
  }
  console.log('TOTAL_SUPPLY_USERS=' + r.rows.length + ' MISMATCHES=' + mism);
  await c.end();
})().catch((e) => {
  console.error('ERR', e.message);
  process.exit(1);
});