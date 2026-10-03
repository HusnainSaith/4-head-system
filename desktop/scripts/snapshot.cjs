const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const zlib = require('node:zlib');
const { execFileSync } = require('node:child_process');
const backend = path.resolve(__dirname, '../../4_Head_poltary_system');
const { Client } = require(path.join(backend, 'node_modules/pg'));
const dotenv = require(path.join(backend, 'node_modules/dotenv'));
async function inventory(client) {
  await client.query("SET TIME ZONE 'UTC'");
  const { rows: tables } = await client.query("SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename <> 'migrations' ORDER BY tablename");
  const result = {};
  for (const { tablename } of tables) {
    const quoted = '"' + tablename.replaceAll('"', '""') + '"';
    const { rows } = await client.query(`SELECT row_to_json(t)::text AS record FROM public.${quoted} t`);
    const records = rows.map(row => { const value = JSON.parse(row.record); return JSON.stringify(Object.fromEntries(Object.keys(value).sort().map(key => [key, value[key]]))); }).sort();
    result[tablename] = { count: records.length, sha256: crypto.createHash('sha256').update(records.join('\n')).digest('hex') };
  }
  return result;
}
async function exportSnapshot(destination) {
  const env = dotenv.parse(fs.readFileSync(path.join(backend, '.env')));
  const connection = { host: env.DB_HOST || 'localhost', port: Number(env.DB_PORT || 5432), user: env.DB_USERNAME || 'postgres', password: env.DB_PASSWORD || '', database: env.DB_DATABASE || env.DB_NAME || 'postgres' };
  const client = new Client(connection);
  const bin = env.POSTGRES_BIN || 'C:\\Program Files\\PostgreSQL\\17\\bin';
  const args = ['--host', connection.host, '--port', String(connection.port), '--username', connection.user, '--dbname', connection.database];
  const commandEnv = { ...process.env, PGPASSWORD: connection.password };
  const backup = path.resolve(__dirname, '../../database-backups', `desktop-${new Date().toISOString().replace(/[:.]/g, '-')}`);
  fs.mkdirSync(backup, { recursive: true });
  await client.connect();
  try {
    await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
    const { rows } = await client.query('SELECT pg_export_snapshot() AS snapshot');
    const common = [...args, '--snapshot', rows[0].snapshot, '--no-owner', '--no-privileges'];
    execFileSync(path.join(bin, 'pg_dump.exe'), [...common, '--format=custom', '--file', path.join(backup, 'local-full.dump')], { env: commandEnv, stdio: 'inherit' });
    // A binary file avoids Windows stdout CRLF conversion inside SQL string values.
    const sqlFile = path.join(backup, 'local-data.sql');
    execFileSync(path.join(bin, 'pg_dump.exe'), [...common, '--data-only', '--column-inserts', '--disable-triggers', '--exclude-table=public.migrations', '--file', sqlFile], { env: commandEnv, stdio: 'inherit' });
    const sql = fs.readFileSync(sqlFile);
    const tableInventory = await inventory(client);
    const zipped = zlib.gzipSync(sql, { level: 9 });
    const manifest = { snapshotVersion: crypto.createHash('sha256').update(sql).digest('hex'), exportedAt: new Date().toISOString(), tables: Object.keys(tableInventory).length, records: Object.values(tableInventory).reduce((sum, table) => sum + table.count, 0), users: tableInventory.users?.count || 0, parties: tableInventory.parties?.count || 0, compressedBytes: zipped.length, tableInventory };
    fs.writeFileSync(path.join(destination, 'initial-database.sql.gz'), zipped);
    fs.writeFileSync(path.join(destination, 'initial-database-manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
    fs.writeFileSync(path.join(backup, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
    const uploads = path.resolve(backend, env.UPLOAD_DIR || 'uploads');
    if (fs.existsSync(uploads)) fs.cpSync(uploads, path.join(destination, 'initial-uploads'), { recursive: true });
    await client.query('COMMIT');
    console.log(`Exported ${manifest.records} records from ${manifest.tables} tables. Full backup: ${backup}`);
  } finally { await client.end(); }
}
module.exports = { inventory, exportSnapshot };
if (require.main === module) exportSnapshot(process.argv[2]).catch(error => { console.error(error); process.exitCode = 1; });
