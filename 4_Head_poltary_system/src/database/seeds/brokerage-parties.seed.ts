import * as bcrypt from 'bcryptjs';
import { DataSource, EntityManager, SimpleConsoleLogger } from 'typeorm';
import { PartyTypeEnum } from '../../common/types/party-type.enum';
import { Department } from '../../modules/departments/entities/department.entity';
import { LedgerEntry } from '../../modules/ledger/entities/ledger-entry.entity';
import { Party } from '../../modules/parties/entities/party.entity';
import { Role } from '../../modules/roles/entities/role.entity';
import { User } from '../../modules/users/entities/user.entity';

interface BrokerageEntry {
  name: string;
  partyType: PartyTypeEnum;
  openingBalance: string;
}

export const BROKERAGE_BALANCE_DATE = '2026-10-01';
const ADDITION_NAMES = new Set([
  'Anwer',
  'Imran sports',
  'Khadam Hussain',
  'Dr Waqas',
]);

export const ENTRIES: BrokerageEntry[] = [
  {
    name: 'Anwer',
    partyType: PartyTypeEnum.RANDOM_USER,
    openingBalance: '-500000',
  },
  {
    name: 'Imran sports',
    partyType: PartyTypeEnum.RANDOM_USER,
    openingBalance: '-800000',
  },
  {
    name: 'Khadam Hussain',
    partyType: PartyTypeEnum.RANDOM_USER,
    openingBalance: '-1017000',
  },
  {
    name: 'Faheem & Brothers',
    partyType: PartyTypeEnum.BROKER,
    openingBalance: '-136974140',
  },
  {
    name: 'Zahad Mugal',
    partyType: PartyTypeEnum.CUSTOMER,
    openingBalance: '-18697056',
  },
  {
    name: 'Haji M hussain',
    partyType: PartyTypeEnum.CUSTOMER,
    openingBalance: '-24868806',
  },
  {
    name: 'Munzoor Sab',
    partyType: PartyTypeEnum.CUSTOMER,
    openingBalance: '-18910139',
  },
  {
    name: 'Malik Salman',
    partyType: PartyTypeEnum.CUSTOMER,
    openingBalance: '-21140418',
  },
  {
    name: 'Hafiz zahid sab',
    partyType: PartyTypeEnum.CUSTOMER,
    openingBalance: '-3590881',
  },
  {
    name: 'Rana saleem sab',
    partyType: PartyTypeEnum.BROKER,
    openingBalance: '0',
  },
  {
    name: 'Basharat butt sab',
    partyType: PartyTypeEnum.BROKER,
    openingBalance: '20802089',
  },
  {
    name: 'Basharat butt Feed',
    partyType: PartyTypeEnum.RANDOM_USER,
    openingBalance: '7621200',
  },
  {
    name: 'Kal ejaz Sab',
    partyType: PartyTypeEnum.PARTNER,
    openingBalance: '39614289',
  },
  {
    name: 'Sadique Personal',
    partyType: PartyTypeEnum.RANDOM_USER,
    openingBalance: '-3353732',
  },
  {
    name: 'Liyaqat Ali',
    partyType: PartyTypeEnum.PARTNER,
    openingBalance: '26192716',
  },
  {
    name: 'Muhammad Shafeque sab',
    partyType: PartyTypeEnum.INVESTOR,
    openingBalance: '33644317',
  },
  {
    name: 'Zakat Kahta',
    partyType: PartyTypeEnum.RANDOM_USER,
    openingBalance: '-2781547',
  },
  {
    name: 'ziya Quraishi sab',
    partyType: PartyTypeEnum.FARM,
    openingBalance: '11302054',
  },
  {
    name: 'Umair Khan Sab',
    partyType: PartyTypeEnum.FARM,
    openingBalance: '7932178',
  },
  {
    name: 'ch Imtyaz sab',
    partyType: PartyTypeEnum.FARM,
    openingBalance: '27614',
  },
  {
    name: 'Naveed Quraishi Sab',
    partyType: PartyTypeEnum.FARM,
    openingBalance: '4115464',
  },
  {
    name: 'Five star feed',
    partyType: PartyTypeEnum.FARM,
    openingBalance: '7158040',
  },
  {
    name: 'Yusafe Poultry Farm',
    partyType: PartyTypeEnum.FARM,
    openingBalance: '1830908',
  },
  { name: 'Alrahmat Feed', partyType: PartyTypeEnum.FARM, openingBalance: '0' },
  { name: 'Asif sab', partyType: PartyTypeEnum.FARM, openingBalance: '0' },
  {
    name: 'Rana Farooque Sab',
    partyType: PartyTypeEnum.BROKER,
    openingBalance: '9188295',
  },
  {
    name: 'Soni Dar Sab',
    partyType: PartyTypeEnum.BROKER,
    openingBalance: '3181869',
  },
  {
    name: 'Malik Fasal Sab',
    partyType: PartyTypeEnum.FARM,
    openingBalance: '6338904',
  },
  {
    name: 'Sajawal poultry Farm',
    partyType: PartyTypeEnum.FARM,
    openingBalance: '0',
  },
  {
    name: 'Kashif Sab',
    partyType: PartyTypeEnum.CUSTOMER,
    openingBalance: '-4258004',
  },
  {
    name: 'Ahmad Yar sab',
    partyType: PartyTypeEnum.BROKER,
    openingBalance: '0',
  },
  {
    name: 'Falaq Khata',
    partyType: PartyTypeEnum.RANDOM_USER,
    openingBalance: '7182386',
  },
  {
    name: 'Roze poultry farm Rent khata',
    partyType: PartyTypeEnum.RANDOM_USER,
    openingBalance: '143371',
  },
  {
    name: 'Iqbal Supervisor Sab',
    partyType: PartyTypeEnum.RANDOM_USER,
    openingBalance: '-87000',
  },
  {
    name: 'Haji zahid sab',
    partyType: PartyTypeEnum.BROKER,
    openingBalance: '11693366',
  },
  {
    name: 'Mathy Akram Sab',
    partyType: PartyTypeEnum.CUSTOMER,
    openingBalance: '-402411',
  },
  {
    name: 'Kesan bricks',
    partyType: PartyTypeEnum.RANDOM_USER,
    openingBalance: '571804',
  },
  {
    name: 'Sadique sab',
    partyType: PartyTypeEnum.INVESTOR,
    openingBalance: '1910486',
  },
  {
    name: 'Sub Shahansha Sab',
    partyType: PartyTypeEnum.INVESTOR,
    openingBalance: '1646255',
  },
  {
    name: 'Abdullan sab GWA',
    partyType: PartyTypeEnum.INVESTOR,
    openingBalance: '2290008',
  },
  {
    name: 'Shakeena',
    partyType: PartyTypeEnum.INVESTOR,
    openingBalance: '1747549',
  },
  {
    name: 'Gulam Fareed',
    partyType: PartyTypeEnum.INVESTOR,
    openingBalance: '3470644',
  },
  {
    name: 'Haji naser Sab',
    partyType: PartyTypeEnum.INVESTOR,
    openingBalance: '698164',
  },
  {
    name: 'Sultan Sab (meer pur)',
    partyType: PartyTypeEnum.EMPLOYEE,
    openingBalance: '53120',
  },
  {
    name: 'Akram Sab',
    partyType: PartyTypeEnum.RANDOM_USER,
    openingBalance: '274443',
  },
  {
    name: 'ch Afzal Sab',
    partyType: PartyTypeEnum.RANDOM_USER,
    openingBalance: '-254285',
  },
  {
    name: 'ch Chand sab',
    partyType: PartyTypeEnum.RANDOM_USER,
    openingBalance: '1281609',
  },
  {
    name: 'Rose Khata',
    partyType: PartyTypeEnum.RANDOM_USER,
    openingBalance: '-2733672',
  },
  {
    name: 'Naza gar khata',
    partyType: PartyTypeEnum.RANDOM_USER,
    openingBalance: '-2330800',
  },
  {
    name: 'Line par gar no 1',
    partyType: PartyTypeEnum.RANDOM_USER,
    openingBalance: '63800',
  },
  {
    name: 'GTR SHOPS',
    partyType: PartyTypeEnum.RANDOM_USER,
    openingBalance: '984100',
  },
  {
    name: 'Shaleem ameen',
    partyType: PartyTypeEnum.CUSTOMER,
    openingBalance: '0',
  },
  {
    name: 'Kamety zahaid mugal',
    partyType: PartyTypeEnum.RANDOM_USER,
    openingBalance: '0',
  },
  {
    name: 'Basharat Jat',
    partyType: PartyTypeEnum.RANDOM_USER,
    openingBalance: '-700000',
  },
  {
    name: 'Wajid sab (Pimber)',
    partyType: PartyTypeEnum.RANDOM_USER,
    openingBalance: '2299180',
  },
  {
    name: 'Rana shukat sab',
    partyType: PartyTypeEnum.FARM,
    openingBalance: '-317070',
  },
  {
    name: 'Haroon sab',
    partyType: PartyTypeEnum.RANDOM_USER,
    openingBalance: '-896773',
  },
  {
    name: 'Khuram sab',
    partyType: PartyTypeEnum.CUSTOMER,
    openingBalance: '-49980',
  },
  {
    name: 'DR haq nawaz sab',
    partyType: PartyTypeEnum.FARM,
    openingBalance: '0',
  },
  {
    name: 'Imran Poultry farm',
    partyType: PartyTypeEnum.FARM,
    openingBalance: '0',
  },
  {
    name: 'Maher Imran sab',
    partyType: PartyTypeEnum.BROKER,
    openingBalance: '4979314',
  },
  {
    name: 'Kol sheihan Sab',
    partyType: PartyTypeEnum.FARM,
    openingBalance: '8917066',
  },
  {
    name: 'M hussain Sab',
    partyType: PartyTypeEnum.RANDOM_USER,
    openingBalance: '0',
  },
  {
    name: 'M hussain kharian',
    partyType: PartyTypeEnum.CUSTOMER,
    openingBalance: '-7268300',
  },
  {
    name: 'Faheem Akhter',
    partyType: PartyTypeEnum.PARTNER,
    openingBalance: '21098136',
  },
  {
    name: 'Seqander gujrat',
    partyType: PartyTypeEnum.CUSTOMER,
    openingBalance: '-1414714',
  },
  {
    name: 'Amanullah',
    partyType: PartyTypeEnum.RANDOM_USER,
    openingBalance: '0',
  },
  {
    name: 'Sharazal Ansari',
    partyType: PartyTypeEnum.CUSTOMER,
    openingBalance: '-3126379',
  },
  {
    name: 'Samar sha Saithi',
    partyType: PartyTypeEnum.CUSTOMER,
    openingBalance: '-2592568',
  },
  {
    name: 'Rafaqat sab',
    partyType: PartyTypeEnum.RANDOM_USER,
    openingBalance: '-100000',
  },
  {
    name: 'Musab Sab',
    partyType: PartyTypeEnum.RANDOM_USER,
    openingBalance: '-8845000',
  },
  {
    name: ' kamati GWA',
    partyType: PartyTypeEnum.RANDOM_USER,
    openingBalance: '-2800000',
  },
  {
    name: 'Qaree usama',
    partyType: PartyTypeEnum.RANDOM_USER,
    openingBalance: '-400000',
  },
  {
    name: 'Mian Iqbal',
    partyType: PartyTypeEnum.FARM,
    openingBalance: '461856',
  },
  {
    name: 'Mian Saeed',
    partyType: PartyTypeEnum.RANDOM_USER,
    openingBalance: '3000000',
  },
  {
    name: 'Dr Waqas',
    partyType: PartyTypeEnum.FARM,
    openingBalance: '13431145',
  },
];

async function postOpeningBalance(
  dataSource: EntityManager,
  partyId: string,
  departmentId: string,
  amount: number,
): Promise<void> {
  if (amount === 0) return;
  const ledgerRepo = dataSource.getRepository(LedgerEntry);
  const [account] = await dataSource.query(
    `SELECT id FROM chart_of_accounts WHERE code = $1 LIMIT 1`,
    [amount > 0 ? 'accounts_payable' : 'accounts_receivable'],
  );
  if (!account) throw new Error('Account not found for opening balance');
  const absAmount = Math.abs(amount).toFixed(2);
  const today = BROKERAGE_BALANCE_DATE;
  await ledgerRepo.save([
    ledgerRepo.create({
      departmentId,
      accountId: account.id,
      partyId,
      entryType: amount > 0 ? 'credit' : 'debit',
      amount: absAmount,
      entryDate: today,
      sourceType: 'opening_balance',
      sourceId: partyId,
      description: 'Opening balance',
    }),
    ledgerRepo.create({
      departmentId,
      accountId: account.id,
      entryType: amount > 0 ? 'debit' : 'credit',
      amount: absAmount,
      entryDate: today,
      sourceType: 'opening_balance',
      sourceId: partyId,
      description: 'Opening balance control entry',
    }),
  ]);
}

export async function seedBrokerageParties(
  source: DataSource,
  balanceMode: 'as-of' | 'current' = 'as-of',
  resetOptions?: { detachSupplyLinks: boolean },
  addOnly = false,
) {
  if (addOnly && resetOptions)
    throw new Error('Add-only cannot reset Brokerage');
  return source.transaction(async (dataSource) => {
    await dataSource.query(
      "SELECT pg_advisory_xact_lock(hashtext('brokerage-parties-seed'))",
    );
    if (addOnly) {
      // The new desktop purchase page needs only this empty table. Existing
      // application updates never run the general migration or seed runners.
      const [{ table }] = await dataSource.query(
        "SELECT to_regclass('public.shop_purchases')::text AS table",
      );
      if (!table) {
        await dataSource.query(
          'CREATE TABLE shop_purchases (LIKE supply_purchases INCLUDING ALL)',
        );
        await dataSource.query(
          'ALTER TABLE shop_purchases DROP COLUMN IF EXISTS source_brokerage_sale_id',
        );
        await dataSource.query(
          'ALTER TABLE shop_purchases ADD FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE RESTRICT',
        );
        await dataSource.query(
          'ALTER TABLE shop_purchases ADD FOREIGN KEY (party_id) REFERENCES parties(id) ON DELETE RESTRICT',
        );
        await dataSource.query(
          'ALTER TABLE shop_purchases ADD FOREIGN KEY (vehicle_id) REFERENCES vehicles(id)',
        );
      }
    }
    const departmentRepo = dataSource.getRepository(Department);
    const partyRepo = dataSource.getRepository(Party);
    const userRepo = dataSource.getRepository(User);
    const roleRepo = dataSource.getRepository(Role);

    const brokerageDept = await departmentRepo.findOneBy({ name: 'Brokerage' });
    if (!brokerageDept) throw new Error('Brokerage department not found');
    const reset = resetOptions
      ? await resetBrokerageTransactions(
          dataSource,
          brokerageDept.id,
          resetOptions.detachSupplyLinks,
        )
      : undefined;

    const staffRole = await roleRepo.findOneBy({ name: 'department_staff' });
    if (!staffRole) throw new Error('department_staff role not found');

    const passwordHash = await bcrypt.hash('ChangeMe123', 12);

    const selectedEntries = addOnly
      ? ENTRIES.filter((entry) => ADDITION_NAMES.has(entry.name))
      : ENTRIES;
    const skipped = new Set<string>();
    for (const entry of selectedEntries) {
      const email = `${entry.name.toLowerCase().replace(/[^a-z0-9]/g, '.')}@brokerage.local`;

      let user = await userRepo.findOneBy({ email });
      if (!user && !addOnly) {
        user = await userRepo.save(
          userRepo.create({
            fullName: entry.name,
            email,
            passwordHash,
            roleId: staffRole.id,
            departmentId: brokerageDept.id,
            isActive: true,
          }),
        );
      }

      const candidates = await partyRepo
        .createQueryBuilder('party')
        .leftJoinAndSelect('party.departments', 'department')
        .where('(party.userId = :userId OR LOWER(party.name) = LOWER(:name))', {
          userId: user?.id ?? null,
          name: entry.name,
        })
        .andWhere(
          '(party.primaryDepartmentId = :departmentId OR department.id = :departmentId)',
          { departmentId: brokerageDept.id },
        )
        .getMany();
      if (candidates.length > 1)
        throw new Error(`Ambiguous Brokerage party: ${entry.name}`);
      const existing = candidates[0];
      if (addOnly && existing) {
        skipped.add(entry.name);
        continue;
      }
      if (!user) {
        user = await userRepo.save(
          userRepo.create({
            fullName: entry.name,
            email,
            passwordHash,
            roleId: staffRole.id,
            departmentId: brokerageDept.id,
            isActive: true,
          }),
        );
      }

      // These photos are balance snapshots. Keep every transaction and offset it
      // through the opening entry so the balance at the requested date matches.
      const [{ balance }] = existing
        ? await dataSource.query(
            `SELECT COALESCE(SUM(CASE WHEN entry_type = 'credit' THEN amount ELSE -amount END), 0)::text AS balance
       FROM ledger_entries WHERE party_id = $1 AND department_id = $2
       AND source_type != 'opening_balance' AND ($3::boolean OR entry_date <= $4::date)`,
            [
              existing.id,
              brokerageDept.id,
              balanceMode === 'current',
              BROKERAGE_BALANCE_DATE,
            ],
          )
        : [{ balance: '0' }];
      const openingAmount = Number(entry.openingBalance) - Number(balance);

      if (existing) {
        await partyRepo.save({
          ...existing,
          partyType: entry.partyType,
          openingBalance: openingAmount.toFixed(2),
        });
        // Update ledger: remove old opening_balance entries and repost
        await dataSource.getRepository(LedgerEntry).delete({
          sourceType: 'opening_balance',
          sourceId: existing.id,
          departmentId: brokerageDept.id,
        });
        await postOpeningBalance(
          dataSource,
          existing.id,
          brokerageDept.id,
          openingAmount,
        );
      } else {
        const saved = await partyRepo.save(
          partyRepo.create({
            userId: user.id,
            partyType: entry.partyType,
            name: entry.name,
            primaryDepartmentId: brokerageDept.id,
            openingBalance: entry.openingBalance,
            departments: [brokerageDept],
          }),
        );
        await postOpeningBalance(
          dataSource,
          saved.id,
          brokerageDept.id,
          Number(entry.openingBalance),
        );
      }
    }

    // An incorrect snapshot must roll back the whole seed, including new users.
    for (const entry of selectedEntries) {
      if (skipped.has(entry.name)) continue;
      const [result] = await dataSource.query(
        `SELECT COALESCE(SUM(CASE WHEN le.entry_type = 'credit' THEN le.amount ELSE -le.amount END), 0)::text AS balance
       FROM parties p LEFT JOIN ledger_entries le ON le.party_id = p.id AND le.department_id = $2
       AND ($3::boolean OR le.entry_date <= $4::date)
       WHERE p.name = $1 AND p.primary_department_id = $2 AND p.deleted_at IS NULL`,
        [
          entry.name,
          brokerageDept.id,
          balanceMode === 'current',
          BROKERAGE_BALANCE_DATE,
        ],
      );
      if (Number(result.balance) !== Number(entry.openingBalance)) {
        throw new Error(`Balance verification failed for ${entry.name}`);
      }
    }
    console.log(
      `✅ Brokerage parties seeded and verified (${ENTRIES.length} entries)`,
    );
    return {
      date: BROKERAGE_BALANCE_DATE,
      balanceMode,
      parties: selectedEntries.length,
      added: addOnly ? selectedEntries.length - skipped.size : undefined,
      skipped: addOnly ? [...skipped] : undefined,
      reset,
    };
  });
}

export async function resetBrokerageTransactions(
  manager: EntityManager,
  departmentId: string,
  detachSupplyLinks: boolean,
) {
  const [{ count: linked }] = await manager.query(
    `SELECT COUNT(*)::int AS count FROM supply_purchases sp
     JOIN brokerage_sales bs ON bs.id = sp.source_brokerage_sale_id
     WHERE bs.department_id = $1`,
    [departmentId],
  );
  if (linked && !detachSupplyLinks) {
    throw new Error(
      'Supply purchases reference Brokerage sales; explicit --detach-supply-links is required.',
    );
  }
  // Do not leave unrelated investment/payroll records without their postings.
  const [{ count: unsupported }] = await manager.query(
    `SELECT (SELECT COUNT(*) FROM employees WHERE department_id = $1)
      + (SELECT COUNT(*) FROM investment_assignments WHERE department_id = $1 OR purchase_id IN (SELECT id FROM brokerage_purchases WHERE department_id = $1))
      + (SELECT COUNT(*) FROM expenses WHERE department_id = $1) AS count`,
    [departmentId],
  );
  if (Number(unsupported))
    throw new Error(
      'Brokerage has payroll, investments or expenses requiring a separate reset plan.',
    );

  const counts: Record<string, number> = {};
  if (linked) {
    const [, affected] = await manager.query(
      `UPDATE supply_purchases SET source_brokerage_sale_id = NULL
       WHERE source_brokerage_sale_id IN (SELECT id FROM brokerage_sales WHERE department_id = $1)`,
      [departmentId],
    );
    counts.detachedSupplyLinks = affected;
  }
  await manager.query(
    `DELETE FROM temperature_logs WHERE stock_movement_id IN
     (SELECT id FROM stock_movements WHERE department_id = $1)`,
    [departmentId],
  );
  const [, notificationCount] = await manager.query(
    `DELETE FROM notifications WHERE source_type = 'brokerage'
     OR context->>'route' LIKE '/brokerage/%'`,
  );
  counts.notifications = notificationCount;
  for (const table of [
    'invoices',
    'party_payments',
    'party_settlements',
    'ledger_entries',
    'stock_movements',
    'stock_balances',
    'brokerage_sales',
    'brokerage_purchases',
  ]) {
    const [, affected] = await manager.query(
      `DELETE FROM "${table}" WHERE department_id = $1`,
      [departmentId],
    );
    counts[table] = affected;
  }
  return counts;
}

// Run this file alone. Never import the all-seeds entry point.
if (require.main === module) {
  (async () => {
    const dotenv = await import('dotenv');
    dotenv.config({ path: '.env.local' });
    dotenv.config();
    const { AppDataSource } = await import('../../config/data-source');
    AppDataSource.setOptions({ logging: false, installExtensions: false });
    AppDataSource.logger = new SimpleConsoleLogger(false);
    await AppDataSource.initialize();
    try {
      if (!process.argv.includes('--apply')) {
        console.log(
          JSON.stringify(
            { date: BROKERAGE_BALANCE_DATE, entries: ENTRIES },
            null,
            2,
          ),
        );
        console.log('Preview only. Add --apply to run this seed alone.');
        return;
      }
      if (process.argv.includes('--reset-brokerage')) {
        const backupFile = process.argv
          .find((arg) => arg.startsWith('--backup-file='))
          ?.slice('--backup-file='.length);
        if (!backupFile)
          throw new Error(
            'A database backup is required: --backup-file=absolute-path.json.gz',
          );
        const { readFileSync } = await import('fs');
        const { gunzipSync } = await import('zlib');
        const backup = JSON.parse(
          gunzipSync(readFileSync(backupFile)).toString('utf8'),
        );
        if (
          !backup.tables?.brokerage_sales ||
          !backup.tables?.ledger_entries ||
          !backup.tables?.parties
        ) {
          throw new Error('Invalid Brokerage reset backup');
        }
      }
      const result = await seedBrokerageParties(
        AppDataSource,
        process.argv.includes('--current') ? 'current' : 'as-of',
        process.argv.includes('--reset-brokerage')
          ? {
              detachSupplyLinks: process.argv.includes('--detach-supply-links'),
            }
          : undefined,
        process.argv.includes('--add-only'),
      );
      console.log(JSON.stringify(result));
    } finally {
      await AppDataSource.destroy();
    }
  })().catch((error: Error) => {
    console.error('Brokerage parties seed failed:', error.message);
    process.exitCode = 1;
  });
}
