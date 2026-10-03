const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { inventory } = require('./snapshot.cjs');
const { Client } = require('../../4_Head_poltary_system/node_modules/pg');
async function main() {
  const dataDir = path.join(process.env.APPDATA, '4head-desktop');
  const pidFile = fs.readFileSync(path.join(dataDir, 'postgres-data/postmaster.pid'), 'utf8').split(/\r?\n/);
  const client = new Client({ host: '127.0.0.1', port: Number(pidFile[3]), user: 'postgres', password: crypto.createHash('sha256').update(`${dataDir}:4head-local-db`).digest('hex'), database: '4head_local' });
  const manifest = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../runtime/backend/initial-database-manifest.json')));
  await client.connect();
  try {
    await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
    const actual = await inventory(client);
    const differences = [...new Set([...Object.keys(manifest.tableInventory), ...Object.keys(actual)])].filter(table => JSON.stringify(actual[table]) !== JSON.stringify(manifest.tableInventory[table]));
    const migrations = await client.query('SELECT count(*)::int AS count FROM migrations');
    const report = { checkedAt: new Date().toISOString(), snapshotVersion: manifest.snapshotVersion, tables: Object.keys(actual).length, records: Object.values(actual).reduce((sum, t) => sum + t.count, 0), migrations: migrations.rows[0].count, differences, matches: differences.length === 0 };
    fs.writeFileSync(path.resolve(__dirname, '../../qa-artifacts/desktop-database-verification.json'), JSON.stringify(report, null, 2));
    console.log(JSON.stringify(report, null, 2));
    if (differences.length) process.exitCode = 1;
    await client.query('COMMIT');
  } finally { await client.end(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
