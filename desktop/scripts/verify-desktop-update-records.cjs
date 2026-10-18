const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { Client } = require('../../4_Head_poltary_system/node_modules/pg');
const { capture } = require('./verify-existing-database.cjs');

async function main() {
  const version = process.env.FOURHEAD_VERIFY_LABEL || require('../package.json').version;
  const userData = path.join(process.env.APPDATA, '4head-desktop');
  const reportDir = path.resolve(__dirname, '../../qa-artifacts');
  const baselinePath = path.join(reportDir, `desktop-update-${version}-before.json`);
  const port = Number(fs.readFileSync(path.join(userData, 'postgres-data/postmaster.pid'), 'utf8').split(/\r?\n/)[3]);
  const password = crypto.createHash('sha256').update(`${userData}:4head-local-db`).digest('hex');
  const client = new Client({ host: '127.0.0.1', port, user: 'postgres', password, database: '4head_local' });
  try {
    await client.connect();
    await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
    await client.query("SET LOCAL TIME ZONE 'UTC'");
    const actual = await capture(client);
    await client.query('ROLLBACK');
    fs.mkdirSync(reportDir, { recursive: true });
    if (process.argv.includes('--before')) {
      fs.writeFileSync(baselinePath, JSON.stringify(actual, null, 2), { flag: 'wx' });
      console.log(`Captured ${Object.keys(actual.tables).length} desktop tables`);
    } else {
      const before = JSON.parse(fs.readFileSync(baselinePath, 'utf8'));
      const names = [...new Set([...Object.keys(before.tables), ...Object.keys(actual.tables)])];
      const differences = names.filter(name => JSON.stringify(before.tables[name]) !== JSON.stringify(actual.tables[name]) || JSON.stringify(before.columns[name]) !== JSON.stringify(actual.columns[name]));
      const report = { version, checkedAt: new Date().toISOString(), tables: names.length, records: Object.values(actual.tables).reduce((sum, table) => sum + table.count, 0), differences, matches: differences.length === 0 };
      fs.writeFileSync(path.join(reportDir, `desktop-update-${version}-verification.json`), JSON.stringify(report, null, 2));
      console.log(JSON.stringify(report, null, 2));
      if (!report.matches) throw new Error('Desktop database records or schema changed');
    }
  } finally { await client.end(); }
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
