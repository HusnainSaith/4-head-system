# 4Head desktop release

For an application-only update that preserves the existing packaged snapshot:

```powershell
cd D:\4Head\desktop
npm.cmd run dist:update
```

This rebuilds the application without exporting a database or changing uploads.
It requires an existing prepared runtime. Existing desktop databases are reused;
application updates do not replace their records, run general migrations, or seed data.
Required payroll columns and indexes are upgraded separately. The upgrade compares
SHA-256 fingerprints of every existing column value inside the same transaction
and rolls back if any original record changes. A full desktop database backup is
kept under the desktop user-data directory before each new application version.

Build from the current frontend, backend, and local PostgreSQL database:

```powershell
cd D:\4Head\desktop
npm.cmd run dist
```

The output includes a Windows installer and portable EXE under `release`.
Both include a private copy of the local database configured by the backend
`.env`, including existing logins, all business records, and local uploads.
Keep these EXEs private because they contain the database snapshot.

The exporter saves a full PostgreSQL backup under `database-backups/desktop-*`
and records a count and SHA-256 fingerprint for every business table in the
snapshot manifest. Dumps use a consistent database transaction and binary file
output to preserve newlines within stored text.

The packaged snapshot is imported only when no desktop PostgreSQL data directory
exists. An existing desktop database is preserved even if the snapshot differs.
Local and desktop databases are separate copies; later edits do not sync
between them automatically. Use the existing local account credentials.

With the updated desktop running, verify every imported table from the repository
root with:

```powershell
node desktop/scripts/verify-desktop-snapshot.cjs
```

The result is written to `qa-artifacts/desktop-database-verification.json`.

For an existing-database verification (while the desktop is running), capture a
baseline before the update and compare original columns after it with:

```powershell
node desktop/scripts/verify-existing-database.cjs
```

The report is saved under `qa-artifacts/desktop-existing-record-verification.json`.
Testing with `FOURHEAD_TEST_SKIP_WINDOW=true` avoids refreshing a saved login
session; `FOURHEAD_TEST_AUTO_QUIT_MS` controls the test shutdown delay.
