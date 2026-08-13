const crypto = require('node:crypto');
const fs = require('node:fs');
const net = require('node:net');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const workspaceDir = path.resolve(__dirname, '..', '..');
const backendDir = path.join(workspaceDir, '4_Head_poltary_system');
const desktopDataDir = path.join(
  process.env.APPDATA,
  '4head-desktop',
  'postgres-data',
);

function parseEnv(file) {
  const values = {};
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (match) values[match[1].trim()] = match[2].trim();
  }
  return values;
}

function quote(identifier) {
  return `"${String(identifier).replaceAll('"', '""')}"`;
}

function reservePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      const port = typeof address === 'object' && address ? address.port : 0;
      server.close(() => resolve(port));
    });
  });
}

async function tableMetadata(client) {
  const result = await client.query(`
    SELECT t.table_name,
           json_agg(c.column_name ORDER BY c.ordinal_position)
             FILTER (WHERE c.is_generated = 'NEVER') AS columns
      FROM information_schema.tables t
      JOIN information_schema.columns c
        ON c.table_schema = t.table_schema
       AND c.table_name = t.table_name
     WHERE t.table_schema = 'public'
       AND t.table_type = 'BASE TABLE'
     GROUP BY t.table_name
     ORDER BY t.table_name
  `);
  return new Map(
    result.rows.map((row) => [
      row.table_name,
      typeof row.columns === 'string' ? JSON.parse(row.columns) : row.columns,
    ]),
  );
}

async function rowCounts(client, tables) {
  const counts = {};
  for (const table of tables) {
    const result = await client.query(
      `SELECT count(*)::int AS count FROM ${quote(table)}`,
    );
    counts[table] = result.rows[0].count;
  }
  return counts;
}

async function copyTable(source, target, table, columns) {
  const selected = columns.map(quote).join(', ');
  const rows = (await source.query(`SELECT ${selected} FROM ${quote(table)}`))
    .rows;
  const batchSize = Math.max(1, Math.floor(50_000 / columns.length));
  for (let offset = 0; offset < rows.length; offset += batchSize) {
    const batch = rows.slice(offset, offset + batchSize);
    const values = [];
    const groups = batch.map((row) => {
      const parameters = columns.map((column) => {
        values.push(row[column]);
        return `$${values.length}`;
      });
      return `(${parameters.join(', ')})`;
    });
    await target.query(
      `INSERT INTO ${quote(table)} (${selected}) VALUES ${groups.join(', ')}`,
      values,
    );
  }
  return rows.length;
}

async function main() {
  if (process.env.CONFIRM_REPLACE_LOCAL !== 'desktop-to-local') {
    throw new Error(
      'Set CONFIRM_REPLACE_LOCAL=desktop-to-local to authorize replacement.',
    );
  }
  if (!fs.existsSync(path.join(desktopDataDir, 'PG_VERSION'))) {
    throw new Error(`Desktop database was not found at ${desktopDataDir}`);
  }

  const EmbeddedPostgres = (await import('embedded-postgres')).default;
  const { Client } = require(path.join(backendDir, 'node_modules', 'pg'));
  const localEnv = parseEnv(path.join(backendDir, '.env'));
  const localDatabase = localEnv.DB_DATABASE || localEnv.DB_NAME;
  if (
    localEnv.DB_HOST !== 'localhost' ||
    localEnv.DB_PORT !== '5432' ||
    localDatabase !== '4Head_db'
  ) {
    throw new Error('Refusing to replace an unexpected local database target.');
  }

  const desktopPort = await reservePort();
  const desktopPassword = crypto
    .createHash('sha256')
    .update(`${path.dirname(desktopDataDir)}:4head-local-db`)
    .digest('hex');
  const database = new EmbeddedPostgres({
    databaseDir: desktopDataDir,
    user: 'postgres',
    password: desktopPassword,
    port: desktopPort,
    persistent: true,
    postgresFlags: ['-h', '127.0.0.1'],
  });

  let source;
  let target;
  try {
    await database.start();
    const migration = spawnSync(
      process.env.ComSpec || 'cmd.exe',
      ['/d', '/s', '/c', 'npm.cmd', 'run', 'migration:run'],
      {
        cwd: backendDir,
        env: {
          ...process.env,
          NODE_ENV: 'desktop',
          DB_HOST: '127.0.0.1',
          DB_PORT: String(desktopPort),
          DB_USERNAME: 'postgres',
          DB_PASSWORD: desktopPassword,
          DB_DATABASE: '4head_local',
        },
        encoding: 'utf8',
      },
    );
    if (migration.status !== 0) {
      throw new Error(
        `Desktop migration failed:\n${migration.stdout}\n${migration.stderr}`,
      );
    }

    source = new Client({
      host: '127.0.0.1',
      port: desktopPort,
      user: 'postgres',
      password: desktopPassword,
      database: '4head_local',
    });
    target = new Client({
      host: localEnv.DB_HOST,
      port: Number(localEnv.DB_PORT),
      user: localEnv.DB_USERNAME,
      password: localEnv.DB_PASSWORD,
      database: localDatabase,
    });
    await source.connect();
    await target.connect();

    const sourceMetadata = await tableMetadata(source);
    const targetMetadata = await tableMetadata(target);
    const sourceTables = [...sourceMetadata.keys()];
    const missing = sourceTables.filter((table) => !targetMetadata.has(table));
    if (missing.length) {
      throw new Error(`Local schema is missing tables: ${missing.join(', ')}`);
    }
    for (const table of sourceTables) {
      const sourceColumns = sourceMetadata.get(table);
      const targetColumns = targetMetadata.get(table);
      const absent = sourceColumns.filter(
        (column) => !targetColumns.includes(column),
      );
      if (absent.length) {
        throw new Error(`${table} is missing columns: ${absent.join(', ')}`);
      }
    }

    const sourceCounts = await rowCounts(source, sourceTables);
    await target.query('BEGIN');
    try {
      await target.query("SET LOCAL session_replication_role = 'replica'");
      if (sourceTables.length) {
        await target.query(
          `TRUNCATE TABLE ${sourceTables.map(quote).join(', ')} RESTART IDENTITY CASCADE`,
        );
      }
      for (const table of sourceTables) {
        const copied = await copyTable(
          source,
          target,
          table,
          sourceMetadata.get(table),
        );
        if (copied !== sourceCounts[table]) {
          throw new Error(`Incomplete copy for ${table}`);
        }
      }
      await target.query('COMMIT');
    } catch (error) {
      await target.query('ROLLBACK');
      throw error;
    }

    const targetCounts = await rowCounts(target, sourceTables);
    const mismatches = sourceTables.filter(
      (table) => sourceCounts[table] !== targetCounts[table],
    );
    if (mismatches.length) {
      throw new Error(`Row-count verification failed: ${mismatches.join(', ')}`);
    }

    const totalRows = Object.values(sourceCounts).reduce(
      (sum, count) => sum + count,
      0,
    );
    const result = {
      sourceDatabase: 'desktop/4head_local',
      targetDatabase: 'localhost:5432/4Head_db',
      tables: sourceTables.length,
      rows: totalRows,
      users: sourceCounts.users ?? 0,
      migrations: sourceCounts.migrations ?? 0,
      verified: true,
      counts: sourceCounts,
    };
    const backupRoot = fs
      .readFileSync(
        path.join(workspaceDir, 'database-backups', 'latest-sync-backup.txt'),
        'utf8',
      )
      .trim();
    fs.writeFileSync(
      path.join(backupRoot, 'desktop-to-local-sync-manifest.json'),
      `${JSON.stringify(result, null, 2)}\n`,
    );
    console.log(JSON.stringify(result, null, 2));
  } finally {
    if (source) await source.end().catch(() => undefined);
    if (target) await target.end().catch(() => undefined);
    await database.stop().catch(() => undefined);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
