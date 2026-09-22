const fs = require('fs');
const sql = fs.readFileSync('snapshot-decompressed.sql', 'utf8');

const supplyUuid =
  '3cecbc8a-f983-41d4-bc31-0ac989650fa3'; // Supply dept uuid (from departments parse)

const partyInserts = [
  ...sql.matchAll(/INSERT INTO public\.parties\s+\(([^)]*)\)\s*VALUES\s*\(([\s\S]*?)\);\s*\n/g),
];
console.log('TOTAL_PARTY_INSERTS=' + partyInserts.length);
for (let i = 0; i < Math.min(2, partyInserts.length); i++) {
  console.log('---RAW[' + i + '] cols=' + partyInserts[i][1]);
  console.log(partyInserts[i][2].slice(0, 400));
}

// Robust: any row whose VALUES block contains the supply uuid
let containingSupply = 0;
let supplyNames = [];
let allNames = [];
for (const m of partyInserts) {
  const raw = m[2];
  const name = (raw.match(/'((?:[^'\\]|\\.)*)'/) || [])[1];
  allNames.push(name);
  if (raw.includes(supplyUuid)) {
    containingSupply++;
    supplyNames.push(name);
  }
}
console.log('PARTIES_REFERENCING_SUPPLY_UUID=' + containingSupply);
console.log('SUPPLY_NAMES_FIRST=' + JSON.stringify(supplyNames.slice(0, 10)));
console.log('SUPPLY_NAMES_LAST=' + JSON.stringify(supplyNames.slice(-10)));

// Count rows whose name is in our 138 list
const s = fs.readFileSync(
  'src/database/seeds/supply-wastage-customers.seed.ts',
  'utf8',
);
const our = [...s.matchAll(/fullName: '([^']*)'/g)].map((x) => x[1]);
const inSnapshot = our.filter((n) => allNames.includes(n));
console.log('OUR_138_FOUND_IN_SNAPSHOT=' + inSnapshot.length);
console.log('MISSING_FROM_SNAPSHOT=' + JSON.stringify(our.filter((n) => !allNames.includes(n))));