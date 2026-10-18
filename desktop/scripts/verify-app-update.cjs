const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { capture } = require('./verify-existing-database.cjs');
const backend = path.resolve(__dirname, '../../4_Head_poltary_system');
const { Client } = require(path.join(backend, 'node_modules/pg'));
const dotenv = require(path.join(backend, 'node_modules/dotenv'));
const version = process.env.FOURHEAD_VERIFY_LABEL || require('../package.json').version;
const reportDir = path.resolve(__dirname, '../../qa-artifacts');
const baselinePath = path.join(reportDir, `app-update-${version}-before.json`);

function files(root) {
  if (!fs.existsSync(root)) return null;
  const result = {};
  function visit(directory) {
    for (const item of fs.readdirSync(directory, { withFileTypes: true })) {
      const file = path.join(directory, item.name);
      if (item.isDirectory()) visit(file);
      else if (item.isFile()) result[path.relative(root, file)] = crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
      else throw new Error(`Unexpected non-regular file in protected directory: ${file}`);
    }
  }
  visit(root);
  return result;
}

async function currentState() {
  const runtime = path.resolve(__dirname, '../runtime/backend');
  const userData = path.join(process.env.APPDATA, '4head-desktop');
  const protectedFiles = {
    desktopDatabase: files(path.join(userData, 'postgres-data')),
    desktopUploads: files(path.join(userData, 'uploads')),
    packagedUploads: files(path.join(runtime, 'initial-uploads')),
    packagedModules: files(path.join(runtime, 'modules')),
  };
  for (const name of ['initial-database.sql.gz', 'initial-database-manifest.json'])
    protectedFiles[name] = crypto.createHash('sha256').update(fs.readFileSync(path.join(runtime, name))).digest('hex');
  const config = {};
  for (const name of ['.env', '.env.local']) {
    const file = path.join(backend, name);
    if (fs.existsSync(file)) Object.assign(config, dotenv.parse(fs.readFileSync(file)));
  }
  const client = new Client({ host: config.DB_HOST || 'localhost', port: Number(config.DB_PORT || 5432), user: config.DB_USERNAME || 'postgres', password: config.DB_PASSWORD || '', database: config.DB_DATABASE || config.DB_NAME || 'postgres' });
  try {
    await client.connect();
    await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
    await client.query("SET LOCAL TIME ZONE 'UTC'");
    const localDatabase = await capture(client);
    await client.query('ROLLBACK');
    return { protectedFiles, localDatabase };
  } finally { await client.end(); }
}

async function main() {
  fs.mkdirSync(reportDir, { recursive: true });
  const state = await currentState();
  if (process.argv.includes('--before')) {
    if (fs.existsSync(baselinePath)) throw new Error('The baseline already exists; preserve the original baseline');
    fs.writeFileSync(baselinePath, JSON.stringify(state, null, 2));
    console.log(`Captured read-only baseline for version ${version}`);
    return;
  }
  const before = JSON.parse(fs.readFileSync(baselinePath, 'utf8'));
  const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  const checks = Object.fromEntries(Object.keys(state.protectedFiles).map(key => [key, same(before.protectedFiles[key], state.protectedFiles[key])]));
  checks.localDatabase = same(before.localDatabase, state.localDatabase);
  const report = { version, checkedAt: new Date().toISOString(), checks, localTables: Object.keys(state.localDatabase.tables).length, localRecords: Object.values(state.localDatabase.tables).reduce((sum, table) => sum + table.count, 0), matches: Object.values(checks).every(Boolean) };
  fs.writeFileSync(path.join(reportDir, `app-update-${version}-verification.json`), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  if (!report.matches) throw new Error('Protected database or upload contents differ from the baseline');
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
