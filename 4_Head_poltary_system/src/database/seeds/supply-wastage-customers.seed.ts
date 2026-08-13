import * as bcrypt from 'bcryptjs';
import { DataSource } from 'typeorm';
import { PartyTypeEnum } from '../../common/types/party-type.enum';
import { Department } from '../../modules/departments/entities/department.entity';
import { Party } from '../../modules/parties/entities/party.entity';
import { Role } from '../../modules/roles/entities/role.entity';
import { User } from '../../modules/users/entities/user.entity';

interface SeedPartyUser {
  fullName: string;
  email: string;
  phone?: string;
}

// Entries already present in this seed are intentionally retained. New entries
// are appended so running the seed never removes or renames existing users.
const seedUsers: SeedPartyUser[] = [
  { fullName: 'Riyaz', email: 'riyas@supply.local', phone: '0304-5705026' },
  { fullName: 'Khuram', email: 'khuram@supply.local', phone: '0307-3217902' },
  { fullName: 'Mehmood', email: 'mehmood@supply.local', phone: '0304-3000214' },
  {
    fullName: 'Sharafat',
    email: 'sharafat@supply.local',
    phone: '0325-6461161',
  },
  {
    fullName: 'Abdul Shakoor',
    email: 'abdul.shakoor@supply.local',
    phone: '0302-4471906',
  },
  {
    fullName: 'Omer Zameer',
    email: 'omer.zameer@supply.local',
    phone: '0329-8104171',
  },
  {
    fullName: 'Abdul Raza',
    email: 'abdul.raza@supply.local',
    phone: '0300-6168408',
  },
  {
    fullName: 'Hafiz Rashid',
    email: 'hafiz.rashid@supply.local',
    phone: '0303-4377950',
  },
  {
    fullName: 'Anees Rehmani',
    email: 'anees.rehmani@supply.local',
    phone: '0324-0778003',
  },
  {
    fullName: 'Ali Ansari',
    email: 'ali.ansari@supply.local',
    phone: '0325-7966927',
  },
  {
    fullName: 'Nouman Ansari',
    email: 'nouman.ansari@supply.local',
    phone: '0327-6454958',
  },
  {
    fullName: 'Azeem Toopay',
    email: 'azeem.toopay@supply.local',
    phone: '0329-8369770',
  },
  {
    fullName: 'Wajid Raza',
    email: 'wajid.raza@supply.local',
    phone: '0306-6460632',
  },
  {
    fullName: 'Faisal Naseem',
    email: 'faisal.naseem@supply.local',
    phone: '0339-4654786',
  },
  {
    fullName: 'Nadeem Iqbal',
    email: 'nadeem.iqbal@supply.local',
    phone: '0306-9443191',
  },
  {
    fullName: 'Saleem Mirza',
    email: 'saleem.mirza@supply.local',
    phone: '0305-4291192',
  },
  {
    fullName: 'Tahir Abbas',
    email: 'tahir.abbas@supply.local',
    phone: '0305-1629445',
  },
  {
    fullName: 'Muhammad Kashif',
    email: 'muhammad.kashif@supply.local',
    phone: '0307-6433324',
  },
  { fullName: 'Imran', email: 'imran@supply.local', phone: '0316-7166050' },
  { fullName: 'Wajid', email: 'wajid@supply.local', phone: '0307-3376058' },
  {
    fullName: 'Mian Wali',
    email: 'mian.wali@supply.local',
    phone: '0300-6458987',
  },
  {
    fullName: 'Frazay Khan',
    email: 'frazay.khan@supply.local',
    phone: '0322-4647268',
  },
  { fullName: 'Luqman', email: 'luqman@supply.local', phone: '0325-1544009' },
  { fullName: 'Farhan', email: 'farhan@supply.local', phone: '0324-9478164' },
  {
    fullName: 'Hassan Gulbazaar',
    email: 'hassan.gulbazaar@supply.local',
    phone: '0313-7845245',
  },
  { fullName: 'Shahab', email: 'shahab@supply.local', phone: '0320-5957267' },
  { fullName: 'Jameel', email: 'jameel@supply.local', phone: '0303-4662107' },
  {
    fullName: 'Irfan Gulbazaar',
    email: 'irfan.gulbazaar@supply.local',
    phone: '0302-4012350',
  },
  {
    fullName: 'Thar Aamir',
    email: 'thar.aamir@supply.local',
    phone: 'thar.aamir@supply.local',
  },
  {
    fullName: 'Hafiz Qasim',
    email: 'hafiz.qasim@supply.local',
    phone: '0303-4181286',
  },
  {
    fullName: 'Rana Sahil',
    email: 'rana.sahil@supply.local',
    phone: '0320-5872674',
  },
  {
    fullName: 'Rana Aklam',
    email: 'rana.aklam@supply.local',
    phone: '0304-6607537',
  },
  {
    fullName: 'Waseem Mandilar',
    email: 'waseem.mandilar@supply.local',
    phone: '0320-7165247',
  },
  {
    fullName: 'Amro Masi',
    email: 'amro.masi@supply.local',
    phone: '0326-5464583',
  },
  { fullName: 'Warisha', email: 'warisha@supply.local', phone: '0300-6412445' },
  {
    fullName: 'Asif Malik',
    email: 'asif.malik@supply.local',
    phone: '0329-5313252',
  },
  {
    fullName: 'Nouman Iqbal',
    email: 'nouman.iqbal2@supply.local',
    phone: '0321-4630881',
  },
  {
    fullName: 'Rana Yaqeem',
    email: 'rana.yaqeeb@supply.local',
    phone: '0306-6640360',
  },

  // Previously missing photographed rows 14-19 and 21-24.
  { fullName: 'Abid', email: 'abid@supply.local', phone: '0301-6135529' },
  { fullName: 'Zeeshan', email: 'zeeshan@supply.local', phone: '0318-5075878' },
  {
    fullName: 'Abdul Rasheed',
    email: 'abdul.rasheed@supply.local',
    phone: '0304-5146310',
  },
  {
    fullName: 'Shahzad Topa',
    email: 'shahzad.topa@supply.local',
    phone: '0300-6449109',
  },
  {
    fullName: 'Amil Ghausia',
    email: 'amil.ghausia@supply.local',
    phone: '0300-6474306',
  },
  { fullName: 'Zaheer', email: 'zaheer@supply.local', phone: '0303-4533421' },
  { fullName: 'Taleemi', email: 'taleemi@supply.local', phone: '0319-6449626' },
  {
    fullName: 'Ali Raza',
    email: 'ali.raza@supply.local',
    phone: '0301-6669316',
  },
  {
    fullName: 'Faisal Ghausia',
    email: 'faisal.ghausia@supply.local',
    phone: '0301-6444887',
  },
  { fullName: 'Mushtaq', email: 'mushtaq@supply.local', phone: '0324-6520191' },

  // Photographed rows 49-61.
  { fullName: 'Tayyab', email: 'tayyab@supply.local', phone: '0324-1791482' },
  { fullName: 'Zubair', email: 'zubair@supply.local', phone: '0327-6420359' },
  { fullName: 'Usman', email: 'usman@supply.local', phone: '0306-5945032' },
  {
    fullName: 'Hafiz Zaman',
    email: 'hafiz.zaman@supply.local',
    phone: '0321-7009804',
  },
  {
    fullName: 'Malik Aamir',
    email: 'malik.aamir@supply.local',
    phone: '0303-0032914',
  },
  { fullName: 'Mohsin', email: 'mohsin@supply.local', phone: '0307-9640200' },
  { fullName: 'Ahmad', email: 'ahmad@supply.local', phone: '0326-1001614' },
  { fullName: 'Ashraf', email: 'ashraf@supply.local', phone: '0303-7156190' },
  { fullName: 'Abdul Qadoos', email: 'abdul.qadoos@supply.local' },
  { fullName: 'Asim', email: 'asim@supply.local' },
  { fullName: 'Javed', email: 'javed@supply.local' },
  { fullName: 'Faisal Hanif', email: 'faisal.hanif@supply.local' },
  { fullName: 'Babar', email: 'babar@supply.local' },
];

export async function seedSupplyWastageCustomers(dataSource: DataSource) {
  const userRepo = dataSource.getRepository(User);
  const partyRepo = dataSource.getRepository(Party);
  const departmentRepo = dataSource.getRepository(Department);
  const roleRepo = dataSource.getRepository(Role);

  const supplyDepartment = await departmentRepo.findOneBy({ name: 'Supply' });
  const wastageDepartment = await departmentRepo.findOneBy({ name: 'Wastage' });
  if (!supplyDepartment || !wastageDepartment) {
    throw new Error('Supply or Wastage department not found during seeding');
  }

  const departmentStaffRole = await roleRepo.findOneBy({
    name: 'department_staff',
  });
  if (!departmentStaffRole) {
    throw new Error('department_staff role not found during seeding');
  }

  // Hash once per seed run. Existing credentials are never reset.
  const initialPasswordHash = await bcrypt.hash('ChangeMe123', 12);
  for (const seed of seedUsers) {
    let user = await userRepo.findOneBy({ email: seed.email });
    if (!user) {
      user = await userRepo.save(
        userRepo.create({
          ...seed,
          roleId: departmentStaffRole.id,
          departmentId: supplyDepartment.id,
          isActive: true,
          passwordHash: initialPasswordHash,
        }),
      );
    }

    let party = await partyRepo.findOne({
      where: [{ userId: user.id }, { name: user.fullName }],
      relations: ['departments'],
    });
    if (!party) {
      party = partyRepo.create({
        userId: user.id,
        partyType: PartyTypeEnum.CUSTOMER,
        name: user.fullName,
        phone: user.phone,
        primaryDepartmentId: supplyDepartment.id,
        openingBalance: '0',
        departments: [supplyDepartment, wastageDepartment],
      });
    } else {
      const departmentsById = new Map(
        (party.departments ?? []).map((department) => [
          department.id,
          department,
        ]),
      );
      departmentsById.set(supplyDepartment.id, supplyDepartment);
      departmentsById.set(wastageDepartment.id, wastageDepartment);
      party.departments = [...departmentsById.values()];
    }
    await partyRepo.save(party);
  }
}
