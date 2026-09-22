import * as bcrypt from 'bcryptjs';
import { DataSource } from 'typeorm';
import { PartyTypeEnum } from '../../common/types/party-type.enum';
import { Department } from '../../modules/departments/entities/department.entity';
import { LedgerEntry } from '../../modules/ledger/entities/ledger-entry.entity';
import { Party } from '../../modules/parties/entities/party.entity';
import { Role } from '../../modules/roles/entities/role.entity';
import { User } from '../../modules/users/entities/user.entity';

interface SeedPartyUser {
  fullName: string;
  email: string;
  phone?: string;
  partyType?: PartyTypeEnum;
  openingBalance?: string;
}

export const SUPPLY_PARTY_SEED_ENTRIES: SeedPartyUser[] = [
  { fullName: 'Osama Supply Gaari', email: 'supply-1@supply.local', partyType: PartyTypeEnum.SHOP_OWNER, openingBalance: '-6226' },
  { fullName: 'Asif Phatak', email: 'supply-2@supply.local', partyType: PartyTypeEnum.SHOP_OWNER, openingBalance: '-3200681' },
  { fullName: 'Anees Rahmani', email: 'supply-3@supply.local', partyType: PartyTypeEnum.SHOP_OWNER, openingBalance: '-2364950' },
  { fullName: 'Azam Toolex', email: 'supply-4@supply.local', partyType: PartyTypeEnum.SHOP_OWNER, openingBalance: '-71394' },
  { fullName: 'Ahmad (Abdullah Road)', email: 'supply-5@supply.local', partyType: PartyTypeEnum.SHOP_OWNER, openingBalance: '-3940050' },
  { fullName: 'Ashraf (Abdullah Road)', email: 'supply-6@supply.local', partyType: PartyTypeEnum.SHOP_OWNER, openingBalance: '-390832' },
  { fullName: 'Isram', email: 'supply-7@supply.local', partyType: PartyTypeEnum.SHOP_OWNER, openingBalance: '-63380' },
  { fullName: 'Osama', email: 'supply-8@supply.local', partyType: PartyTypeEnum.SHOP_OWNER, openingBalance: '-18673' },
  { fullName: 'Imtiaz', email: 'supply-9@supply.local', partyType: PartyTypeEnum.SHOP_OWNER, openingBalance: '-48600' },
  { fullName: 'Asif c/o Chand', email: 'supply-10@supply.local', partyType: PartyTypeEnum.SHOP_OWNER, openingBalance: '-42490' },
  { fullName: 'Abu Huraira', email: 'supply-11@supply.local', partyType: PartyTypeEnum.SHOP_OWNER, openingBalance: '-46000' },
  { fullName: 'Ahsan Supply Gaari', email: 'supply-12@supply.local', partyType: PartyTypeEnum.SHOP_OWNER, openingBalance: '-156559' },
  { fullName: 'Ahmad Javed', email: 'supply-13@supply.local', partyType: PartyTypeEnum.SHOP_OWNER, openingBalance: '-8761' },
  { fullName: 'Anil Ghouthia', email: 'supply-14@supply.local', partyType: PartyTypeEnum.SHOP_OWNER, openingBalance: '-27079' },
  { fullName: 'Babar (for Isram Kamran)', email: 'supply-15@supply.local', partyType: PartyTypeEnum.SHOP_OWNER, openingBalance: '-8034' },
  { fullName: 'Babar Park Town', email: 'supply-16@supply.local', partyType: PartyTypeEnum.SHOP_OWNER, openingBalance: '-239710' },
  { fullName: 'Bilal Habibpura', email: 'supply-17@supply.local', partyType: PartyTypeEnum.SHOP_OWNER, openingBalance: '-6951' },
  { fullName: 'Pervez Supply Gaari', email: 'supply-18@supply.local', partyType: PartyTypeEnum.SHOP_OWNER, openingBalance: '-80032' },
  { fullName: 'Tankhwah Khata', email: 'supply-19@supply.local', partyType: PartyTypeEnum.SHOP_OWNER, openingBalance: '0' },
  { fullName: 'Saqlain', email: 'supply-20@supply.local', partyType: PartyTypeEnum.SHOP_OWNER, openingBalance: '-93003' },
  { fullName: 'Jameel Gol Bazaar', email: 'supply-21@supply.local', partyType: PartyTypeEnum.SHOP_OWNER, openingBalance: '-49275' },
  { fullName: 'Jameel Driver', email: 'supply-22@supply.local', partyType: PartyTypeEnum.SHOP_OWNER, openingBalance: '-6188' },
  { fullName: 'Javed Park Town', email: 'supply-23@supply.local', partyType: PartyTypeEnum.SHOP_OWNER, openingBalance: '154' },
  { fullName: 'Javed Dhobri', email: 'supply-24@supply.local', partyType: PartyTypeEnum.SHOP_OWNER, openingBalance: '-65827' },
  { fullName: 'Chaudhry Ijaz Ahmad', email: 'supply-25@supply.local', partyType: PartyTypeEnum.SHOP_OWNER, openingBalance: '-621975' },
  { fullName: 'Haji Nazir (Masjid Khata)', email: 'supply-26@supply.local', partyType: PartyTypeEnum.SHOP_OWNER, openingBalance: '-39556' },
  { fullName: 'Hafiz Qasim', email: 'supply-27@supply.local', partyType: PartyTypeEnum.SHOP_OWNER, openingBalance: '-2186497' },
  { fullName: 'Hafiz Rashid', email: 'supply-28@supply.local', partyType: PartyTypeEnum.SHOP_OWNER, openingBalance: '-3471696' },
  { fullName: 'Hafiz Zaman', email: 'supply-29@supply.local', partyType: PartyTypeEnum.SHOP_OWNER, openingBalance: '-968919' },
  { fullName: 'Hassan Gol Bazaar', email: 'supply-30@supply.local', partyType: PartyTypeEnum.SHOP_OWNER, openingBalance: '-2947189' },
  { fullName: 'Khurram', email: 'supply-31@supply.local', partyType: PartyTypeEnum.SHOP_OWNER, openingBalance: '-528566' },
  { fullName: 'Khizar', email: 'supply-32@supply.local', partyType: PartyTypeEnum.SHOP_OWNER, openingBalance: '-333' },
  { fullName: 'Dasti Khata', email: 'supply-33@supply.local', partyType: PartyTypeEnum.SHOP_OWNER, openingBalance: '-714000' },
  { fullName: 'Zeeshan', email: 'supply-34@supply.local', partyType: PartyTypeEnum.SHOP_OWNER, openingBalance: '-7103' },
  { fullName: 'Zulfiqar (Al Noor Hotel)', email: 'supply-35@supply.local', partyType: PartyTypeEnum.SHOP_OWNER, openingBalance: '-2522546' },
  { fullName: 'Zeeshan Shani', email: 'supply-36@supply.local', partyType: PartyTypeEnum.SHOP_OWNER, openingBalance: '-462527' },
  { fullName: 'Riaz', email: 'supply-37@supply.local', partyType: PartyTypeEnum.SHOP_OWNER, openingBalance: '-1202184' },
  { fullName: 'Rana Waseem', email: 'supply-38@supply.local', partyType: PartyTypeEnum.SHOP_OWNER, openingBalance: '-299053' },
  { fullName: 'Rana Sohail', email: 'supply-39@supply.local', partyType: PartyTypeEnum.SHOP_OWNER, openingBalance: '-4787928' },
  { fullName: 'Rana Khayyam', email: 'supply-40@supply.local', partyType: PartyTypeEnum.SHOP_OWNER, openingBalance: '-311256' },
  { fullName: 'Rana Ilyas', email: 'supply-41@supply.local', partyType: PartyTypeEnum.SHOP_OWNER, openingBalance: '-175500' },
  { fullName: 'Rana Tayyab', email: 'supply-42@supply.local', partyType: PartyTypeEnum.SHOP_OWNER, openingBalance: '-125179' },
  { fullName: 'Roz Zati Khata', email: 'supply-43@supply.local', partyType: PartyTypeEnum.SHOP_OWNER, openingBalance: '9026' },
  { fullName: 'Rana Asim', email: 'supply-44@supply.local', partyType: PartyTypeEnum.SHOP_OWNER, openingBalance: '-199188' },
  { fullName: 'Ramzan Kushada', email: 'supply-45@supply.local', partyType: PartyTypeEnum.SHOP_OWNER, openingBalance: '0' },
  { fullName: 'Zain Supply Gaari', email: 'supply-46@supply.local', partyType: PartyTypeEnum.SHOP_OWNER, openingBalance: '886' },
  { fullName: 'Zubair Mandir Road', email: 'supply-47@supply.local', partyType: PartyTypeEnum.SHOP_OWNER, openingBalance: '-1174203' },
  { fullName: 'Sufyan Supply Gaari', email: 'supply-48@supply.local', partyType: PartyTypeEnum.SHOP_OWNER, openingBalance: '-173406' },
  { fullName: 'Sufyan Mandir Road', email: 'supply-49@supply.local', partyType: PartyTypeEnum.SHOP_OWNER, openingBalance: '-233805' },
  { fullName: 'Cylinder', email: 'supply-50@supply.local', partyType: PartyTypeEnum.SHOP_OWNER, openingBalance: '-51023' },
  { fullName: 'Sajjad (Driver)', email: 'supply-51@supply.local', partyType: PartyTypeEnum.SHOP_OWNER, openingBalance: '41000' },
  { fullName: 'Shahroze Supply Gaari', email: 'supply-52@supply.local', partyType: PartyTypeEnum.SHOP_OWNER, openingBalance: '-31727' },
  { fullName: 'Shahid Masih', email: 'supply-53@supply.local', partyType: PartyTypeEnum.SHOP_OWNER, openingBalance: '-30697' },
  { fullName: 'Shahab Gol Bazaar', email: 'supply-54@supply.local', partyType: PartyTypeEnum.SHOP_OWNER, openingBalance: '-6305457' },
  { fullName: 'Sharafat Ali', email: 'supply-55@supply.local', partyType: PartyTypeEnum.SHOP_OWNER, openingBalance: '-26805398' },
  { fullName: 'Shahzad Ghouthia Chowk', email: 'supply-56@supply.local', partyType: PartyTypeEnum.SHOP_OWNER, openingBalance: '-2449807' },
  { fullName: 'Sheikh Umar', email: 'supply-57@supply.local', partyType: PartyTypeEnum.SHOP_OWNER, openingBalance: '-812195' },
  { fullName: 'Sharafat 2', email: 'supply-58@supply.local', partyType: PartyTypeEnum.SHOP_OWNER, openingBalance: '350000' },
  { fullName: 'Shamis', email: 'supply-59@supply.local', partyType: PartyTypeEnum.SHOP_OWNER, openingBalance: '-77149' },
  { fullName: 'Sheikh Akram', email: 'supply-60@supply.local', partyType: PartyTypeEnum.SHOP_OWNER, openingBalance: '-3236602' },
  { fullName: 'Sheikh Nadeem', email: 'supply-61@supply.local', partyType: PartyTypeEnum.SHOP_OWNER, openingBalance: '-2771' },
  { fullName: 'Shahzad Shah', email: 'supply-62@supply.local', partyType: PartyTypeEnum.SHOP_OWNER, openingBalance: '-7846' },
  { fullName: 'Sheikh Faisal Machli Wala', email: 'supply-63@supply.local', partyType: PartyTypeEnum.SHOP_OWNER, openingBalance: '-70287' },
  { fullName: 'Shahbaz', email: 'supply-64@supply.local', partyType: PartyTypeEnum.SHOP_OWNER, openingBalance: '-92635' },
  { fullName: 'Shahzaib', email: 'supply-65@supply.local', partyType: PartyTypeEnum.SHOP_OWNER, openingBalance: '-7015' },
  { fullName: 'Shahbaz Riaz', email: 'supply-66@supply.local', partyType: PartyTypeEnum.SHOP_OWNER, openingBalance: '-584625' },
  { fullName: 'Shahbaz Bhatti', email: 'supply-67@supply.local', partyType: PartyTypeEnum.SHOP_OWNER, openingBalance: '-525955' },
  { fullName: 'Zaheer Ghouthia Chowk', email: 'supply-68@supply.local', partyType: PartyTypeEnum.SHOP_OWNER, openingBalance: '-535244' },
  { fullName: 'Umar Nadeem', email: 'supply-69@supply.local', partyType: PartyTypeEnum.SHOP_OWNER, openingBalance: '-1999155' },
  { fullName: 'Inaam Bhatti', email: 'supply-70@supply.local', partyType: PartyTypeEnum.SHOP_OWNER, openingBalance: '-171292' },
  { fullName: 'Usman', email: 'supply-71@supply.local', partyType: PartyTypeEnum.SHOP_OWNER, openingBalance: '-674299' },
  { fullName: 'Irfan Ansari', email: 'supply-72@supply.local', partyType: PartyTypeEnum.SHOP_OWNER, openingBalance: '-13120' },
  { fullName: 'Amir Habibpura', email: 'supply-73@supply.local', partyType: PartyTypeEnum.SHOP_OWNER, openingBalance: '-1430730' },
  { fullName: 'Abbas Sabzi Mandi', email: 'supply-74@supply.local', partyType: PartyTypeEnum.SHOP_OWNER, openingBalance: '-87820' },
  { fullName: 'Ali Raza', email: 'supply-75@supply.local', partyType: PartyTypeEnum.SHOP_OWNER, openingBalance: '-3665378' },
  { fullName: 'Adeel Ghouthia', email: 'supply-76@supply.local', partyType: PartyTypeEnum.SHOP_OWNER, openingBalance: '-2516379' },
  { fullName: 'Ali Ansari', email: 'supply-77@supply.local', partyType: PartyTypeEnum.SHOP_OWNER, openingBalance: '-814430' },
  { fullName: 'Abdul Shakoor', email: 'supply-78@supply.local', partyType: PartyTypeEnum.SHOP_OWNER, openingBalance: '-435645' },
  { fullName: 'Imran Park Town', email: 'supply-79@supply.local', partyType: PartyTypeEnum.SHOP_OWNER, openingBalance: '-31631' },
  { fullName: 'Irfan', email: 'supply-80@supply.local', partyType: PartyTypeEnum.SHOP_OWNER, openingBalance: '-28801' },
  { fullName: 'Adnan Ahsan', email: 'supply-81@supply.local', partyType: PartyTypeEnum.SHOP_OWNER, openingBalance: '-62196' },
  { fullName: 'Usman Mushtaq', email: 'supply-82@supply.local', partyType: PartyTypeEnum.SHOP_OWNER, openingBalance: '-9358' },
  { fullName: 'Usman Mandir Bala Road', email: 'supply-83@supply.local', partyType: PartyTypeEnum.SHOP_OWNER, openingBalance: '-15500' },
  { fullName: 'Irfan Younas', email: 'supply-84@supply.local', partyType: PartyTypeEnum.SHOP_OWNER, openingBalance: '-16005' },
  { fullName: 'Ubad Fareed', email: 'supply-85@supply.local', partyType: PartyTypeEnum.SHOP_OWNER, openingBalance: '-652073' },
  { fullName: 'Usman Bhatti', email: 'supply-86@supply.local', partyType: PartyTypeEnum.SHOP_OWNER, openingBalance: '-114674' },
  { fullName: 'Irfan Gol Bazaar', email: 'supply-87@supply.local', partyType: PartyTypeEnum.SHOP_OWNER, openingBalance: '-211547' },
  { fullName: 'Asim Habibpura', email: 'supply-88@supply.local', partyType: PartyTypeEnum.SHOP_OWNER, openingBalance: '-205197' },
  { fullName: 'Abbas Habibpura', email: 'supply-89@supply.local', partyType: PartyTypeEnum.SHOP_OWNER, openingBalance: '-13687' },
  { fullName: 'Abdul Ghafoor', email: 'supply-90@supply.local', partyType: PartyTypeEnum.SHOP_OWNER, openingBalance: '-99445' },
  { fullName: 'Ghulam Mustafa', email: 'supply-91@supply.local', partyType: PartyTypeEnum.SHOP_OWNER, openingBalance: '-246561' },
  { fullName: 'Azeem (Look)', email: 'supply-92@supply.local', partyType: PartyTypeEnum.SHOP_OWNER, openingBalance: '-1400' },
  { fullName: 'Faheem and Brothers Supply', email: 'supply-93@supply.local', partyType: PartyTypeEnum.SHOP_OWNER, openingBalance: '145100154' },
  { fullName: 'Faheem Akhtar', email: 'supply-94@supply.local', partyType: PartyTypeEnum.SHOP_OWNER, openingBalance: '-621975' },
  { fullName: 'First Chicken Shop', email: 'supply-95@supply.local', partyType: PartyTypeEnum.SHOP_OWNER, openingBalance: '-15034873' },
  { fullName: 'Faisal Ghouthia', email: 'supply-96@supply.local', partyType: PartyTypeEnum.SHOP_OWNER, openingBalance: '-199225' },
  { fullName: 'Faisal Rehnuma', email: 'supply-97@supply.local', partyType: PartyTypeEnum.SHOP_OWNER, openingBalance: '-821558' },
  { fullName: 'Farhan Supply', email: 'supply-98@supply.local', partyType: PartyTypeEnum.SHOP_OWNER, openingBalance: '-83118' },
  { fullName: 'Fayyaz', email: 'supply-99@supply.local', partyType: PartyTypeEnum.SHOP_OWNER, openingBalance: '-2710' },
  { fullName: 'Faisal Ansari', email: 'supply-100@supply.local', partyType: PartyTypeEnum.SHOP_OWNER, openingBalance: '-950181' },
  { fullName: 'Faisal Hanif', email: 'supply-101@supply.local', partyType: PartyTypeEnum.SHOP_OWNER, openingBalance: '-62361' },
  { fullName: 'Qamar Abbas', email: 'supply-102@supply.local', partyType: PartyTypeEnum.SHOP_OWNER, openingBalance: '6338' },
  { fullName: 'Kamran Supply Gaari', email: 'supply-103@supply.local', partyType: PartyTypeEnum.SHOP_OWNER, openingBalance: '30161' },
  { fullName: 'Gaari Baqaya Khata', email: 'supply-104@supply.local', partyType: PartyTypeEnum.SHOP_OWNER, openingBalance: '0' },
  { fullName: 'Liaqat Ali', email: 'supply-105@supply.local', partyType: PartyTypeEnum.SHOP_OWNER, openingBalance: '-621975' },
  { fullName: 'Luqman Utility', email: 'supply-106@supply.local', partyType: PartyTypeEnum.SHOP_OWNER, openingBalance: '-118862' },
  { fullName: 'Mutafarriq Ikhrajat', email: 'supply-107@supply.local', partyType: PartyTypeEnum.SHOP_OWNER, openingBalance: '0' },
  { fullName: 'Masjid Hidayat', email: 'supply-108@supply.local', partyType: PartyTypeEnum.SHOP_OWNER, openingBalance: '0' },
  { fullName: 'Muhammad Wajid Sharifpura', email: 'supply-109@supply.local', partyType: PartyTypeEnum.SHOP_OWNER, openingBalance: '-9704862' },
  { fullName: 'Mian Hotel', email: 'supply-110@supply.local', partyType: PartyTypeEnum.SHOP_OWNER, openingBalance: '-2280614' },
  { fullName: 'Muharram', email: 'supply-111@supply.local', partyType: PartyTypeEnum.SHOP_OWNER, openingBalance: '-8745' },
  { fullName: 'Malik Ishtiaq Ahmad', email: 'supply-112@supply.local', partyType: PartyTypeEnum.SHOP_OWNER, openingBalance: '-395113' },
  { fullName: 'Mohsin Sooli Road', email: 'supply-113@supply.local', partyType: PartyTypeEnum.SHOP_OWNER, openingBalance: '-23388' },
  { fullName: 'Mubashir', email: 'supply-114@supply.local', partyType: PartyTypeEnum.SHOP_OWNER, openingBalance: '-670709' },
  { fullName: 'Malik Ghulam Abbas', email: 'supply-115@supply.local', partyType: PartyTypeEnum.SHOP_OWNER, openingBalance: '-320511' },
  { fullName: 'Malik Arif', email: 'supply-116@supply.local', partyType: PartyTypeEnum.SHOP_OWNER, openingBalance: '-87713' },
  { fullName: 'Mehr Sabir', email: 'supply-117@supply.local', partyType: PartyTypeEnum.SHOP_OWNER, openingBalance: '25000' },
  { fullName: 'Malik Amir', email: 'supply-118@supply.local', partyType: PartyTypeEnum.SHOP_OWNER, openingBalance: '-453733' },
  { fullName: 'Muhammad Rizwan', email: 'supply-119@supply.local', partyType: PartyTypeEnum.SHOP_OWNER, openingBalance: '-11992' },
  { fullName: 'Nisar Ahmad', email: 'supply-120@supply.local', partyType: PartyTypeEnum.SHOP_OWNER, openingBalance: '-451527' },
  { fullName: 'Naveed Mughal', email: 'supply-121@supply.local', partyType: PartyTypeEnum.SHOP_OWNER, openingBalance: '-514860' },
  { fullName: 'Naveed Ansari', email: 'supply-122@supply.local', partyType: PartyTypeEnum.SHOP_OWNER, openingBalance: '-413072' },
  { fullName: 'Noman Raheel', email: 'supply-123@supply.local', partyType: PartyTypeEnum.SHOP_OWNER, openingBalance: '-254733' },
  { fullName: 'Nadeem Mughal', email: 'supply-124@supply.local', partyType: PartyTypeEnum.SHOP_OWNER, openingBalance: '-693461' },
  { fullName: 'Naseem Abbas', email: 'supply-125@supply.local', partyType: PartyTypeEnum.SHOP_OWNER, openingBalance: '-11924' },
  { fullName: 'Naveed Shah', email: 'supply-126@supply.local', partyType: PartyTypeEnum.SHOP_OWNER, openingBalance: '-4031' },
  { fullName: 'Nadeem Khan', email: 'supply-127@supply.local', partyType: PartyTypeEnum.SHOP_OWNER, openingBalance: '-59600' },
  { fullName: 'Naghman', email: 'supply-128@supply.local', partyType: PartyTypeEnum.SHOP_OWNER, openingBalance: '-143219' },
  { fullName: 'Noori', email: 'supply-129@supply.local', partyType: PartyTypeEnum.SHOP_OWNER, openingBalance: '-1131' },
  { fullName: 'Wazan Kami', email: 'supply-130@supply.local', partyType: PartyTypeEnum.SHOP_OWNER, openingBalance: '0' },
  { fullName: 'Waseem Supply Gaari', email: 'supply-131@supply.local', partyType: PartyTypeEnum.SHOP_OWNER, openingBalance: '-174136' },
  { fullName: 'Waseem Mandir Wala', email: 'supply-132@supply.local', partyType: PartyTypeEnum.SHOP_OWNER, openingBalance: '-416797' },
  { fullName: 'Waheed ur Rahmani', email: 'supply-133@supply.local', partyType: PartyTypeEnum.SHOP_OWNER, openingBalance: '-640619' },
  { fullName: 'Waqas', email: 'supply-134@supply.local', partyType: PartyTypeEnum.SHOP_OWNER, openingBalance: '-917338' },
  { fullName: 'Waqar Khan', email: 'supply-135@supply.local', partyType: PartyTypeEnum.SHOP_OWNER, openingBalance: '-82700' },
  { fullName: 'Waris Lillah', email: 'supply-136@supply.local', partyType: PartyTypeEnum.SHOP_OWNER, openingBalance: '-195610' },
  { fullName: 'Kitchen Kharcha', email: 'supply-137@supply.local', partyType: PartyTypeEnum.SHOP_OWNER, openingBalance: '0' },
  { fullName: 'Tasaduq', email: 'supply-138@supply.local', partyType: PartyTypeEnum.SHOP_OWNER, openingBalance: '0' },
];

export function getSupplySeedPartyRoleName(): string {
  return 'PARTY';
}

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
    [amount > 0 ? 'accounts_payable' : 'accounts_receivable'],
  );

  if (!account) {
    throw new Error('Account not found for supply opening balance');
  }

  const absAmount = Math.abs(amount).toFixed(2);
  const today = new Date().toISOString().slice(0, 10);

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

export async function seedSupplyWastageCustomers(dataSource: DataSource) {
  const userRepo = dataSource.getRepository(User);
  const partyRepo = dataSource.getRepository(Party);
  const departmentRepo = dataSource.getRepository(Department);
  const roleRepo = dataSource.getRepository(Role);

  const supplyDepartment = await departmentRepo.findOneBy({ name: 'Supply' });
  if (!supplyDepartment) {
    throw new Error('Supply department not found during seeding');
  }

  const partyRole =
    (await roleRepo.findOneBy({ name: getSupplySeedPartyRoleName() })) ??
    (await roleRepo.save(
      roleRepo.create({
        name: getSupplySeedPartyRoleName(),
        description: 'External business party',
      }),
    ));

  // Collect ALL party IDs that belong to supply seed entries — by department
  // or by linked user email (catches stale records from previous runs).
  const supplyPartyRows = await dataSource.query(`
    SELECT DISTINCT p.id FROM parties p
    LEFT JOIN party_departments pd ON pd.party_id = p.id
    WHERE p.primary_department_id = $1 OR pd.department_id = $1
    UNION
    SELECT DISTINCT p.id FROM parties p
    JOIN users u ON u.id = p.user_id
    WHERE u.email LIKE '%@supply.local'
  `, [supplyDepartment.id]);
  const supplyPartyIds = supplyPartyRows.map((row) => row.id);

  if (supplyPartyIds.length > 0) {
    await dataSource.query(`DELETE FROM ledger_entries WHERE party_id = ANY($1)`, [supplyPartyIds]);
    await dataSource.query(`UPDATE supply_purchases SET party_id = NULL WHERE party_id = ANY($1)`, [supplyPartyIds]);
    await dataSource.query(`UPDATE supply_sales SET party_id = NULL WHERE party_id = ANY($1)`, [supplyPartyIds]);
    await dataSource.query(`DELETE FROM party_departments WHERE party_id = ANY($1)`, [supplyPartyIds]);
    await dataSource.query(`DELETE FROM parties WHERE id = ANY($1)`, [supplyPartyIds]);
  }

  await dataSource.query(`DELETE FROM users WHERE email LIKE '%@supply.local'`);

  const initialPasswordHash = await bcrypt.hash('ChangeMe123', 12);
  for (const seed of SUPPLY_PARTY_SEED_ENTRIES) {
    let user = await userRepo.findOneBy({ email: seed.email });
    if (!user) {
      user = await userRepo.save(
        userRepo.create({
          fullName: seed.fullName,
          email: seed.email,
          phone: seed.phone,
          roleId: partyRole.id,
          departmentId: supplyDepartment.id,
          isActive: true,
          passwordHash: initialPasswordHash,
        }),
      );
    }

    let party = await partyRepo.findOne({
      where: { userId: user.id },
      relations: ['departments'],
    });

    const openingBalance = Number(seed.openingBalance ?? '0');
    if (!party) {
      party = partyRepo.create({
        userId: user.id,
        partyType: seed.partyType ?? PartyTypeEnum.CUSTOMER,
        name: user.fullName,
        phone: user.phone,
        primaryDepartmentId: supplyDepartment.id,
        openingBalance: openingBalance.toFixed(2),
        departments: [supplyDepartment],
      });
    } else {
      party.departments = [supplyDepartment];
      party.partyType = seed.partyType ?? party.partyType ?? PartyTypeEnum.CUSTOMER;
      party.phone = user.phone ?? party.phone;
      party.openingBalance = openingBalance.toFixed(2);
      party.primaryDepartmentId = supplyDepartment.id;
    }

    const savedParty = await partyRepo.save(party);
    await dataSource
      .getRepository(LedgerEntry)
      .delete({ sourceType: 'opening_balance', sourceId: savedParty.id });
    await postOpeningBalance(
      dataSource,
      savedParty.id,
      supplyDepartment.id,
      openingBalance,
    );
  }
}
