import * as bcrypt from 'bcryptjs';
import { DataSource } from 'typeorm';
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

const ENTRIES: BrokerageEntry[] = [
  { name: 'Faheem & Brothers',           partyType: PartyTypeEnum.BROKER,      openingBalance: '-130922529' },
  { name: 'Zahad Mugal',                 partyType: PartyTypeEnum.CUSTOMER,    openingBalance: '-17211641' },
  { name: 'Haji M hussain',              partyType: PartyTypeEnum.CUSTOMER,    openingBalance: '-22732923' },
  { name: 'Munzoor Sab',                 partyType: PartyTypeEnum.CUSTOMER,    openingBalance: '-19692208' },
  { name: 'Malik Salman',                partyType: PartyTypeEnum.CUSTOMER,    openingBalance: '-17793931' },
  { name: 'Hafiz zahid sab',             partyType: PartyTypeEnum.CUSTOMER,    openingBalance: '-2792605' },
  { name: 'Rana saleem sab',             partyType: PartyTypeEnum.BROKER,      openingBalance: '-1897607' },
  { name: 'Basharat butt sab',           partyType: PartyTypeEnum.BROKER,      openingBalance: '11642165' },
  { name: 'Basharat butt Feed',          partyType: PartyTypeEnum.RANDOM_USER, openingBalance: '1587750' },
  { name: 'Kal ejaz Sab',               partyType: PartyTypeEnum.INVESTOR,    openingBalance: '35856231' },
  { name: 'Sadique Personal',            partyType: PartyTypeEnum.RANDOM_USER, openingBalance: '-1285479' },
  { name: 'Liyaqat Ali',                 partyType: PartyTypeEnum.INVESTOR,    openingBalance: '23181054' },
  { name: 'Muhammad Shafeque sab',       partyType: PartyTypeEnum.INVESTOR,    openingBalance: '34034155' },
  { name: 'Zakat Kahta',                 partyType: PartyTypeEnum.RANDOM_USER, openingBalance: '-1665297' },
  { name: 'ziya Quraishi sab',           partyType: PartyTypeEnum.FARM,        openingBalance: '5916316' },
  { name: 'Umair Khan Sab',              partyType: PartyTypeEnum.FARM,        openingBalance: '14901548' },
  { name: 'ch Imtyaz sab',               partyType: PartyTypeEnum.FARM,        openingBalance: '109114' },
  { name: 'Naveed Quraishi Sab',         partyType: PartyTypeEnum.FARM,        openingBalance: '6979672' },
  { name: 'Five star feed',              partyType: PartyTypeEnum.FARM,        openingBalance: '6904080' },
  { name: 'Yusafe Poultry Farm',         partyType: PartyTypeEnum.FARM,        openingBalance: '0' },
  { name: 'Alrahmat Feed',               partyType: PartyTypeEnum.FARM,        openingBalance: '1593636' },
  { name: 'Asif sab',                    partyType: PartyTypeEnum.FARM,        openingBalance: '15333222' },
  { name: 'Rana Farooque Sab',           partyType: PartyTypeEnum.BROKER,      openingBalance: '8006390' },
  { name: 'Soni Dar Sab',               partyType: PartyTypeEnum.BROKER,      openingBalance: '1130282' },
  { name: 'Malik Fasal Sab',             partyType: PartyTypeEnum.FARM,        openingBalance: '6093716' },
  { name: 'Sajawal poultry Farm',        partyType: PartyTypeEnum.FARM,        openingBalance: '6993360' },
  { name: 'Kashif Sab',                  partyType: PartyTypeEnum.CUSTOMER,    openingBalance: '-7132775' },
  { name: 'Ahmad Yar sab',               partyType: PartyTypeEnum.BROKER,      openingBalance: '5519326' },
  { name: 'Falaq Khata',                 partyType: PartyTypeEnum.RANDOM_USER, openingBalance: '-1099260' },
  { name: 'Roze poultry farm Rent khata',partyType: PartyTypeEnum.RANDOM_USER, openingBalance: '351421' },
  { name: 'Iqbal Supervisor Sab',        partyType: PartyTypeEnum.RANDOM_USER, openingBalance: '-87000' },
  { name: 'Haji zahid sab',              partyType: PartyTypeEnum.BROKER,      openingBalance: '0' },
  { name: 'Mathy Akram Sab',             partyType: PartyTypeEnum.CUSTOMER,    openingBalance: '-402411' },
  { name: 'Kesan bricks',                partyType: PartyTypeEnum.RANDOM_USER, openingBalance: '563579' },
  { name: 'Sadique sab',                 partyType: PartyTypeEnum.INVESTOR,    openingBalance: '1838370' },
  { name: 'Sub Shahansha Sab',           partyType: PartyTypeEnum.INVESTOR,    openingBalance: '1622576' },
  { name: 'Abdullan sab GWA',            partyType: PartyTypeEnum.INVESTOR,    openingBalance: '2246232' },
  { name: 'Shakeena',                    partyType: PartyTypeEnum.INVESTOR,    openingBalance: '1743955' },
  { name: 'Gulam Fareed',                partyType: PartyTypeEnum.INVESTOR,    openingBalance: '3404300' },
  { name: 'Haji naser Sab',              partyType: PartyTypeEnum.INVESTOR,    openingBalance: '684818' },
  { name: 'Sultan Sab (meer pur)',        partyType: PartyTypeEnum.RANDOM_USER, openingBalance: '54020' },
  { name: 'Akram Sab',                   partyType: PartyTypeEnum.RANDOM_USER, openingBalance: '274443' },
  { name: 'ch Afzal Sab',                partyType: PartyTypeEnum.RANDOM_USER, openingBalance: '165585' },
  { name: 'ch Chand sab',                partyType: PartyTypeEnum.RANDOM_USER, openingBalance: '1341609' },
  { name: 'Rose Khata',                  partyType: PartyTypeEnum.RANDOM_USER, openingBalance: '2733672' },
  { name: 'Naza gar khata',              partyType: PartyTypeEnum.RANDOM_USER, openingBalance: '-1259300' },
  { name: 'Line par gar no 1',           partyType: PartyTypeEnum.RANDOM_USER, openingBalance: '31300' },
  { name: 'GTR SHOPS',                   partyType: PartyTypeEnum.RANDOM_USER, openingBalance: '733700' },
  { name: 'Shaleem ameen',               partyType: PartyTypeEnum.CUSTOMER,    openingBalance: '-5635251' },
  { name: 'Kamety zahaid mugal',         partyType: PartyTypeEnum.RANDOM_USER, openingBalance: '90000' },
  { name: 'Basharat Jat',                partyType: PartyTypeEnum.RANDOM_USER, openingBalance: '-700000' },
  { name: 'Wajid sab (Pimber)',          partyType: PartyTypeEnum.RANDOM_USER, openingBalance: '2299180' },
  { name: 'Rana shukat sab',             partyType: PartyTypeEnum.FARM,        openingBalance: '-317070' },
  { name: 'Haroon sab',                  partyType: PartyTypeEnum.RANDOM_USER, openingBalance: '-996773' },
  { name: 'Khuram sab',                  partyType: PartyTypeEnum.CUSTOMER,    openingBalance: '-49980' },
  { name: 'DR haq nawaz sab',            partyType: PartyTypeEnum.FARM,        openingBalance: '0' },
  { name: 'Imran Poultry farm',          partyType: PartyTypeEnum.FARM,        openingBalance: '1802325' },
  { name: 'Maher Imran sab',             partyType: PartyTypeEnum.BROKER,      openingBalance: '4836225' },
  { name: 'Kol sheihan Sab',             partyType: PartyTypeEnum.FARM,        openingBalance: '1443646' },
  { name: 'M hussain Sab',               partyType: PartyTypeEnum.RANDOM_USER, openingBalance: '-2492164' },
  { name: 'M hussain kharian',           partyType: PartyTypeEnum.CUSTOMER,    openingBalance: '-5567023' },
  { name: 'Faheem Akhter',               partyType: PartyTypeEnum.INVESTOR,    openingBalance: '18136856' },
  { name: 'Seqander gujrat',             partyType: PartyTypeEnum.CUSTOMER,    openingBalance: '-1405514' },
  { name: 'Amanullah',                   partyType: PartyTypeEnum.RANDOM_USER, openingBalance: '-500000' },
  { name: 'Sharazal Ansari',             partyType: PartyTypeEnum.CUSTOMER,    openingBalance: '-3226379' },
  { name: 'Samar sha Saithi',            partyType: PartyTypeEnum.CUSTOMER,    openingBalance: '-2592562' },
  { name: 'Rafaqat sab',                 partyType: PartyTypeEnum.RANDOM_USER, openingBalance: '0' },
  { name: 'Musab Sab',                   partyType: PartyTypeEnum.RANDOM_USER, openingBalance: '-8945000' },
  { name: 'Faheem Partner kamati GWA',   partyType: PartyTypeEnum.RANDOM_USER, openingBalance: '-1600000' },
  { name: 'Qaree usama',                 partyType: PartyTypeEnum.RANDOM_USER, openingBalance: '-70000' },
];

async function postOpeningBalance(
  dataSource: DataSource,
  partyId: string,
  departmentId: string,
  amount: number,
): Promise<void> {
  if (amount === 0) return;
  const ledgerRepo = dataSource.getRepository(LedgerEntry);
  const [account] = await dataSource.query(
    `SELECT id FROM chart_of_accounts WHERE code = $1 LIMIT 1`,
    [amount > 0 ? 'accounts_receivable' : 'accounts_payable'],
  );
  if (!account) throw new Error('Account not found for opening balance');
  const absAmount = Math.abs(amount).toFixed(2);
  const today = new Date().toISOString().slice(0, 10);
  await ledgerRepo.save([
    ledgerRepo.create({
      departmentId,
      accountId: account.id,
      partyId,
      entryType: amount > 0 ? 'debit' : 'credit',
      amount: absAmount,
      entryDate: today,
      sourceType: 'opening_balance',
      sourceId: partyId,
      description: 'Opening balance',
    }),
    ledgerRepo.create({
      departmentId,
      accountId: account.id,
      entryType: amount > 0 ? 'credit' : 'debit',
      amount: absAmount,
      entryDate: today,
      sourceType: 'opening_balance',
      sourceId: partyId,
      description: 'Opening balance control entry',
    }),
  ]);
}

export async function seedBrokerageParties(dataSource: DataSource) {
  const departmentRepo = dataSource.getRepository(Department);
  const partyRepo = dataSource.getRepository(Party);
  const userRepo = dataSource.getRepository(User);
  const roleRepo = dataSource.getRepository(Role);

  const brokerageDept = await departmentRepo.findOneBy({ name: 'Brokerage' });
  if (!brokerageDept) throw new Error('Brokerage department not found');

  const staffRole = await roleRepo.findOneBy({ name: 'department_staff' });
  if (!staffRole) throw new Error('department_staff role not found');

  const passwordHash = await bcrypt.hash('ChangeMe123', 12);

  for (const entry of ENTRIES) {
    const email = `${entry.name.toLowerCase().replace(/[^a-z0-9]/g, '.')}@brokerage.local`;

    let user = await userRepo.findOneBy({ email });
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

    const existing = await partyRepo.findOne({
      where: [{ userId: user.id }, { name: entry.name }],
      relations: ['departments'],
    });

    if (existing) {
      await partyRepo.save({
        ...existing,
        partyType: entry.partyType,
        openingBalance: entry.openingBalance,
      });
      // Update ledger: remove old opening_balance entries and repost
      await dataSource
        .getRepository(LedgerEntry)
        .delete({ sourceType: 'opening_balance', sourceId: existing.id });
      await postOpeningBalance(dataSource, existing.id, brokerageDept.id, Number(entry.openingBalance));
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
      await postOpeningBalance(dataSource, saved.id, brokerageDept.id, Number(entry.openingBalance));
    }
  }

  console.log(`✅ Brokerage parties seeded (${ENTRIES.length} entries)`);
}
