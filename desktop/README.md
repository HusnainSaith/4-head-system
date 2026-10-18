# 4Head desktop release

Version 1.0.21 uses one party-balance convention in every department:
positive is payable to the party; negative is receivable from the party.
Purchases add to the signed balance, sales subtract, receipts add, and
payments subtract. Overpayments cross zero into the opposite balance type.
Receipt postings split receivable repayment from excess payable credit.
Department party selectors calculate balances from that department's ledger.
Existing transactions and ledger entries are retained without migrations or seeds.

`scripts/test-local-party-signs.cjs` verifies local balances against the saved
ledger with database writes blocked. `scripts/verify-party-balance-signs.cjs`
performs the same read-only reconciliation against the installed desktop app.
Use `release/4Head-Poultry-ERP-1.0.21-Setup.exe` to install this code-only update.

Version 1.0.16 includes party-name search in the settlement form. The installer
is `release/4Head-Poultry-ERP-1.0.16-Setup.exe`. Build this application-only
update with `npm.cmd run dist:update` to preserve the packaged database and uploads.
The existing desktop database is retained without migrations or seeds.
Read-only before/after table fingerprints are captured with
`node scripts/verify-desktop-update-records.cjs --before` and
`node scripts/verify-desktop-update-records.cjs`.

Version 1.0.15 packages the current local application, including payroll bonus
report corrections, purchase/sale search, external transactions, and Fresh
Chicken Shop live-chicken purchases. Use `release/4Head-Poultry-ERP-1.0.15-Setup.exe`
to install the update, or `release/4Head-Poultry-ERP-1.0.15-portable.exe` directly.

The Brokerage additions were applied separately using only
`brokerage-parties.seed.ts` in add-only mode. Anwer, Imran sports, Khadam Hussain,
and Dr Waqas are skipped when they already exist; existing party balances and
transaction records are not rewritten. The update retains the existing desktop
database and uploads. The new Shop purchase table is empty until a purchase is
recorded. General seed runners and the Brokerage reset are not part of this update.

For an application-only update that preserves the existing packaged snapshot:

```powershell
cd D:\4Head\desktop
npm.cmd run dist:update
```

This rebuilds the application without exporting a database or changing uploads.
It requires an existing prepared runtime. Existing desktop databases are reused;
application updates do not replace their records, run general migrations, or seed data.
Version 1.0.14 also disables automatic schema upgrades on an existing desktop
database. Existing database directories, records, and uploads are reused.
A full desktop database backup is kept under the desktop user-data directory
before each new application version. Application output folders are replaced
so removed source files are not accidentally included in an update.

Portable launches extract into independent temporary folders. With the pinned
electron-builder 26.15 implementation, `portable.unpackDirName: true` selects
the per-launch NSIS `$PLUGINSDIR`; false would generate a shared build folder.
This prevents a second launch from deleting the first launch's runtime files.

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
