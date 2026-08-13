import * as bcrypt from 'bcryptjs';
import { DataSource, EntityManager } from 'typeorm';
import { Department } from '../src/modules/departments/entities/department.entity';
import { Employee } from '../src/modules/employees/entities/employee.entity';
import { Party } from '../src/modules/parties/entities/party.entity';
import { PartyTypeEnum } from '../src/common/types/party-type.enum';
import { Role } from '../src/modules/roles/entities/role.entity';
import { User } from '../src/modules/users/entities/user.entity';
import {
  Vehicle,
  VehicleTypeEnum,
} from '../src/modules/vehicles/entities/vehicle.entity';

const MONTHLY_SALARY = '35000.00';
const JOINING_DATE = new Date('2026-01-01');
const DEMO_PASSWORD = process.env.DEMO_SEED_PASSWORD ?? 'Demo@123!';

type DepartmentType = Department['type'];

const departmentCode: Record<DepartmentType, string> = {
  BROKERAGE: 'BRG',
  SUPPLY: 'SUP',
  WASTAGE: 'WST',
  FRESH_CHICKEN_SHOP: 'SHP',
};

const departmentSlug: Record<DepartmentType, string> = {
  BROKERAGE: 'brokerage',
  SUPPLY: 'supply',
  WASTAGE: 'wastage',
  FRESH_CHICKEN_SHOP: 'shop',
};

interface PartyDefinition {
  key: string;
  name: string;
  partyType: PartyTypeEnum;
  primaryDepartment: DepartmentType;
  departments: DepartmentType[];
}

const partyDefinitions: PartyDefinition[] = [
  ...[1, 2, 3].map((index) => ({
    key: `brokerage-farm-${index}`,
    name: `Seed Brokerage Farm ${index}`,
    partyType: PartyTypeEnum.FARM,
    primaryDepartment: 'BROKERAGE' as const,
    departments: ['BROKERAGE' as const],
  })),
  ...[1, 2].map((index) => ({
    key: `brokerage-customer-${index}`,
    name: `Seed Brokerage Customer ${index}`,
    partyType: PartyTypeEnum.CUSTOMER,
    primaryDepartment: 'BROKERAGE' as const,
    departments: ['BROKERAGE' as const],
  })),
  ...[1, 2].map((index) => ({
    key: `supply-broker-${index}`,
    name: `Seed Supply Broker ${index}`,
    partyType: PartyTypeEnum.BROKER,
    primaryDepartment: 'SUPPLY' as const,
    departments: ['SUPPLY' as const],
  })),
  ...[1, 2, 3].map((index) => ({
    key: `shared-shop-owner-${index}`,
    name: `Seed Shared Shop Owner ${index}`,
    partyType: PartyTypeEnum.SHOP_OWNER,
    primaryDepartment: 'SUPPLY' as const,
    departments: ['SUPPLY' as const, 'WASTAGE' as const],
  })),
  ...[1, 2].map((index) => ({
    key: `wastage-factory-${index}`,
    name: `Seed Wastage Factory ${index}`,
    partyType: PartyTypeEnum.FACTORY,
    primaryDepartment: 'WASTAGE' as const,
    departments: ['WASTAGE' as const],
  })),
  ...[1, 2, 3, 4, 5].map((index) => ({
    key: `shop-customer-${index}`,
    name: `Seed Shop Customer ${index}`,
    partyType: PartyTypeEnum.CUSTOMER,
    primaryDepartment: 'FRESH_CHICKEN_SHOP' as const,
    departments: ['FRESH_CHICKEN_SHOP' as const],
  })),
  ...[1, 2, 3].map((index) => ({
    key: `brokerage-random-user-${index}`,
    name: `Seed Random User ${index}`,
    partyType: PartyTypeEnum.RANDOM_USER,
    primaryDepartment: 'BROKERAGE' as const,
    departments: ['BROKERAGE' as const, 'SUPPLY' as const, 'FRESH_CHICKEN_SHOP' as const],
  })),
];

async function ensureRole(manager: EntityManager, name: string): Promise<Role> {
  const repository = manager.getRepository(Role);
  let role = await repository.findOne({ where: { name }, withDeleted: true });
  if (!role) {
    role = await repository.save(
      repository.create({
        name,
        description: `Seeded ${name.replaceAll('_', ' ')} role`,
      }),
    );
  }
  return role;
}

async function ensureUser(
  manager: EntityManager,
  data: {
    email: string;
    fullName: string;
    phone: string;
    roleId: string;
    departmentId: string;
    passwordHash: string;
  },
): Promise<User> {
  const repository = manager.getRepository(User);
  let user = await repository.findOne({
    where: { email: data.email },
    withDeleted: true,
  });
  if (!user) {
    user = repository.create(data);
  } else {
    const { passwordHash: _passwordHash, ...stableData } = data;
    Object.assign(user, stableData);
  }
  Object.assign(user, { isActive: true, deletedAt: null });
  return repository.save(user);
}

async function seedParties(
  manager: EntityManager,
  departments: Map<DepartmentType, Department>,
  roles: Map<string, Role>,
  passwordHash: string,
) {
  const repository = manager.getRepository(Party);
  for (const [index, definition] of partyDefinitions.entries()) {
    const primaryDepartment = departments.get(definition.primaryDepartment)!;
    const user = await ensureUser(manager, {
      email: `party.${definition.key}@poultry.local`,
      fullName: definition.name,
      phone: `0301${String(index + 1).padStart(7, '0')}`,
      roleId: roles.get(definition.partyType)!.id,
      departmentId: primaryDepartment.id,
      passwordHash,
    });
    let party = await repository.findOne({
      where: { name: definition.name },
      relations: { departments: true },
      withDeleted: true,
    });
    if (!party) party = repository.create({ name: definition.name });
    Object.assign(party, {
      userId: user.id,
      partyType: definition.partyType,
      phone: user.phone,
      address: `${definition.name}, Seed Market`,
      primaryDepartmentId: primaryDepartment.id,
      openingBalance: '0.00',
      notes: 'Idempotent demo seed record',
      departments: definition.departments.map((type) => departments.get(type)!),
      deletedAt: null,
    });
    await repository.save(party);
  }
}

async function seedEmployeesAndVehicles(
  manager: EntityManager,
  departments: Department[],
  employeeRole: Role,
  driverRole: Role,
  passwordHash: string,
) {
  const employeeRepository = manager.getRepository(Employee);
  const vehicleRepository = manager.getRepository(Vehicle);

  for (const department of departments) {
    const code = departmentCode[department.type];
    const slug = departmentSlug[department.type];
    for (let index = 1; index <= 7; index += 1) {
      const padded = String(index).padStart(2, '0');
      const fullName = `Seed ${department.name} Employee ${padded}`;
      const user = await ensureUser(manager, {
        email: `employee.${slug}.${padded}@poultry.local`,
        fullName,
        phone: `0310${code.charCodeAt(0)}${String(index).padStart(5, '0')}`,
        roleId: employeeRole.id,
        departmentId: department.id,
        passwordHash,
      });
      const employeeCode = `SEED-${code}-EMP-${padded}`;
      let employee = await employeeRepository.findOne({
        where: { employeeCode },
        withDeleted: true,
      });
      if (!employee) employee = employeeRepository.create({ employeeCode });
      Object.assign(employee, {
        userId: user.id,
        departmentId: department.id,
        fullName,
        designation: index === 1 ? 'Department Supervisor' : 'Staff Member',
        phone: user.phone,
        cnicOrIdNumber: `SEED-${code}-${String(index).padStart(7, '0')}`,
        baseSalary: MONTHLY_SALARY,
        monthlySalary: MONTHLY_SALARY,
        joiningDate: JOINING_DATE,
        joinDate: JOINING_DATE,
        status: 'active',
        isActive: true,
        address: `${department.name} Staff Residence ${index}`,
        deletedAt: null,
      });
      await employeeRepository.save(employee);
    }

    for (let index = 1; index <= 3; index += 1) {
      const padded = String(index).padStart(2, '0');
      const driver = await ensureUser(manager, {
        email: `driver.${slug}.${padded}@poultry.local`,
        fullName: `Seed ${department.name} Driver ${padded}`,
        phone: `0320${code.charCodeAt(0)}${String(index).padStart(5, '0')}`,
        roleId: driverRole.id,
        departmentId: department.id,
        passwordHash,
      });
      const registrationNumber = `${code}-SEED-${padded}`;
      let vehicle = await vehicleRepository.findOne({
        where: { registrationNumber },
        withDeleted: true,
      });
      if (!vehicle) vehicle = vehicleRepository.create({ registrationNumber });
      Object.assign(vehicle, {
        departmentId: department.id,
        vehicleType: [
          VehicleTypeEnum.TRUCK,
          VehicleTypeEnum.VAN,
          VehicleTypeEnum.MOTORCYCLE,
        ][index - 1],
        model: `Seed Fleet ${index}`,
        year: 2024 + index - 1,
        driverUserId: driver.id,
        driverName: driver.fullName,
        notes: 'Idempotent demo seed vehicle',
        isActive: true,
        deletedAt: null,
      });
      await vehicleRepository.save(vehicle);
    }
  }
}

export async function seedDemoBusinessData(dataSource: DataSource) {
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 12);
  await dataSource.transaction(async (manager) => {
    const departments = await manager.getRepository(Department).find({
      where: { isActive: true },
      order: { type: 'ASC' },
    });
    const byType = new Map(
      departments.map((department) => [department.type, department]),
    );
    for (const type of Object.keys(departmentCode) as DepartmentType[]) {
      if (!byType.has(type))
        throw new Error(`Cannot seed demo data: ${type} department is missing`);
    }

    const roleNames = [
      'employee',
      'driver',
      ...new Set(partyDefinitions.map((party) => party.partyType)),
    ];
    const roles = new Map<string, Role>();
    for (const name of roleNames)
      roles.set(name, await ensureRole(manager, name));

    await seedParties(manager, byType, roles, passwordHash);
    await seedEmployeesAndVehicles(
      manager,
      departments,
      roles.get('employee')!,
      roles.get('driver')!,
      passwordHash,
    );
  });

  return {
    linkedPartyCountPerDepartment: 5,
    vehicleCountPerDepartment: 3,
    employeeCountPerDepartment: 7,
    monthlySalary: MONTHLY_SALARY,
  };
}
