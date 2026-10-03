import { createHash } from 'crypto';
import { DataSource, EntityManager } from 'typeorm';

const quote = (value: string) => '"' + value.replace(/"/g, '""') + '"';
type Columns = Map<string, string[]>;
async function fingerprint(manager: EntityManager, columns: Columns) {
  const result = new Map<string, string>();
  for (const [table, fields] of columns) {
    const rows: { record: string }[] = await manager.query(
      `SELECT row_to_json(t)::text AS record FROM (SELECT ${fields.map(quote).join(',')} FROM public.${quote(table)}) t`,
    );
    const records = rows
      .map(({ record }) => {
        const value = JSON.parse(record) as Record<string, unknown>;
        return JSON.stringify(
          Object.fromEntries(
            Object.keys(value)
              .sort()
              .map((key) => [key, value[key]]),
          ),
        );
      })
      .sort();
    result.set(
      table,
      createHash('sha256').update(records.join('\n')).digest('hex'),
    );
  }
  return result;
}

/** Upgrade only application schema; never run data migrations or seeds on existing desktops. */
export async function upgradeExistingDesktopSchema(dataSource: DataSource) {
  return dataSource.transaction(async (manager) => {
    await manager.query(
      "SELECT pg_advisory_xact_lock(hashtext('4head-desktop-schema-upgrade'))",
    );
    const fields: { table_name: string; column_name: string }[] =
      await manager.query(
        "SELECT table_name, column_name FROM information_schema.columns WHERE table_schema='public' ORDER BY table_name, ordinal_position",
      );
    const columns: Columns = new Map();
    for (const field of fields) {
      if (!columns.has(field.table_name)) columns.set(field.table_name, []);
      columns.get(field.table_name)!.push(field.column_name);
    }
    const constraints: { conname: string }[] = await manager.query(
      "SELECT conname FROM pg_constraint WHERE conrelid='salary_runs'::regclass AND contype='u' AND pg_get_constraintdef(oid)='UNIQUE (employee_id, period_month, period_year)'",
    );
    const needsColumns =
      !columns.get('salary_runs')?.includes('manual_deduction') ||
      !columns.get('salary_runs')?.includes('deduction_reason');
    if (!needsColumns && !constraints.length) return;
    await manager.query("SET LOCAL TIME ZONE 'UTC'");
    // Hold existing rows stable until the original-column fingerprints are compared.
    await manager.query(
      `LOCK TABLE ${[...columns.keys()].map((table) => 'public.' + quote(table)).join(',')} IN SHARE ROW EXCLUSIVE MODE`,
    );
    const before = await fingerprint(manager, columns);
    await manager.query(
      'ALTER TABLE salary_runs ADD COLUMN IF NOT EXISTS manual_deduction numeric(14,2) NOT NULL DEFAULT 0 CHECK (manual_deduction >= 0), ADD COLUMN IF NOT EXISTS deduction_reason varchar(255)',
    );
    for (const constraint of constraints)
      await manager.query(
        `ALTER TABLE salary_runs DROP CONSTRAINT ${quote(constraint.conname)}`,
      );
    await manager.query(
      'CREATE UNIQUE INDEX IF NOT EXISTS salary_runs_active_period_unique ON salary_runs (employee_id, period_month, period_year) WHERE deleted_at IS NULL',
    );
    const after = await fingerprint(manager, columns);
    for (const [table, hash] of before) {
      if (hash !== after.get(table))
        throw new Error(
          `Desktop schema upgrade changed existing records in ${table}; rolling back`,
        );
    }
    console.log(
      `[desktop] Schema upgraded; all existing record values preserved across ${columns.size} tables.`,
    );
  });
}
