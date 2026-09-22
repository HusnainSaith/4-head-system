const fs = require('fs');
const s = fs.readFileSync(
  'src/database/seeds/supply-wastage-customers.seed.ts',
  'utf8',
);
const w = fs.readFileSync(
  'src/database/seeds/wastage-shop-owners.seed.ts',
  'utf8',
);
const supply = [...s.matchAll(/fullName: '([^']*)'/g)].map((m) => m[1]);
const rawStart = w.indexOf('const RAW = `');
const rawEnd = w.indexOf('`', rawStart + 'const RAW = `'.length);
const raw = w.slice(rawStart + 'const RAW = `'.length, rawEnd);
const wastage = raw
  .split('\n')
  .map((l) => l.trim())
  .filter((l) => l.includes('|'))
  .map((l) => l.split('|')[0].trim());
const coll = supply.filter((n) => wastage.includes(n));
console.log('SUPPLY_TOTAL=' + supply.length);
console.log('WASTAGE_TOTAL=' + wastage.length);
console.log('COLLISIONS=' + coll.length);
console.log(JSON.stringify(coll, null, 1));