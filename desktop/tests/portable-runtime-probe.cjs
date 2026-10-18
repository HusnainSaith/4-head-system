// Run through the portable launcher with ELECTRON_RUN_AS_NODE=1.
// Checks extraction isolation without starting the app or a database.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const root = path.dirname(process.execPath);
const targets = [
  'resources/backend/dist/src/main.js',
  'resources/app/node_modules/@embedded-postgres/windows-x64/native/share/timezone/GMT',
  'resources/app/node_modules/@embedded-postgres/windows-x64/native/share/timezonesets/Default',
];
const hashes = () => targets.map(file => crypto.createHash('sha256').update(fs.readFileSync(path.join(root, file))).digest('hex'));
const before = hashes();
setTimeout(() => {
  const after = hashes();
  const report = { root, matches: JSON.stringify(before) === JSON.stringify(after) };
  fs.writeFileSync(path.join(process.argv[2], `portable-probe-${process.pid}.json`), JSON.stringify(report, null, 2));
  if (!report.matches) process.exitCode = 1;
}, 15000);
