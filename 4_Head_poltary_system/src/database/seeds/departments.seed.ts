import { DataSource } from 'typeorm';
import { Department } from '../../modules/departments/entities/department.entity';
import { Party } from '../../modules/parties/entities/party.entity';
import { PartyTypeEnum } from '../../common/types/party-type.enum';
import { StockBalance } from '../../modules/inventory/entities/stock-balance.entity';
import { Product } from '../../modules/inventory/entities/product.entity';
import { StockType } from '../../modules/inventory/enums/stock-type.enum';
import { CashAccount } from '../../modules/accounts/entities/cash-account.entity';

export async function seedDepartments(dataSource: DataSource) {
  const departmentRepo = dataSource.getRepository(Department);
  const partyRepo = dataSource.getRepository(Party);
  const stockBalanceRepo = dataSource.getRepository(StockBalance);
  const productRepo = dataSource.getRepository(Product);

  const departments: Partial<Department>[] = [
    {
      name: 'Brokerage',
      type: 'BROKERAGE',
      description: 'Brokerage Department',
      isActive: true,
    },
    {
      name: 'Supply',
      type: 'SUPPLY',
      description: 'Supply Department',
      isActive: true,
    },
    {
      name: 'Wastage',
      type: 'WASTAGE',
      description: 'Wastage Department',
      isActive: true,
    },
    {
      name: 'Fresh Chicken Shop',
      type: 'FRESH_CHICKEN_SHOP',
      description: 'Fresh Chicken Shop Department',
      isActive: true,
    },
  ];

  await departmentRepo.upsert(departments, ['name']);

  const savedDepartments = await departmentRepo.find();

  const cashAccountRepo = dataSource.getRepository(CashAccount);
  for (const department of savedDepartments) {
    const existing = await cashAccountRepo.findOneBy({
      departmentId: department.id,
    });
    if (!existing)
      await cashAccountRepo.save(
        cashAccountRepo.create({
          departmentId: department.id,
          accountName: `${department.name} Cash Drawer`,
          openingBalance: '0.00',
          isActive: true,
        }),
      );
  }

  for (const department of savedDepartments) {
    const internalPartyName = `${department.name} Internal Department`;

    let internalParty = await partyRepo.findOne({
      where: {
        name: internalPartyName,
        primaryDepartmentId: department.id,
      },
    });

    if (!internalParty) {
      internalParty = partyRepo.create({
        partyType: PartyTypeEnum.INTERNAL_DEPARTMENT,
        name: internalPartyName,
        linkedDepartmentId: department.id,
        primaryDepartmentId: department.id,
        openingBalance: '0',
        notes: `Internal party for ${department.name}`,
      });
    } else {
      internalParty.partyType = PartyTypeEnum.INTERNAL_DEPARTMENT;
      internalParty.linkedDepartmentId = department.id;
      internalParty.primaryDepartmentId = department.id;
      internalParty.openingBalance = '0';
      internalParty.notes = `Internal party for ${department.name}`;
    }

    await partyRepo.save(internalParty);
  }

  let product = await productRepo.findOneBy({ sku: 'LIVE-CHICKEN-KG' });
  if (!product) {
    product = await productRepo.save(
      productRepo.create({
        sku: 'LIVE-CHICKEN-KG',
        name: 'Live Chicken',
        description: 'Primary poultry inventory measured in kilograms',
        unit: 'kg',
        category: 'poultry',
        isActive: true,
      }),
    );
  }

  const stockBalances = savedDepartments.flatMap((department) =>
    (department.type === 'FRESH_CHICKEN_SHOP'
      ? [StockType.LIVE, StockType.DRESSED]
      : [StockType.STANDARD]
    ).map((stockType) => ({
      departmentId: department.id,
      productId: product.id,
      stockType,
      quantityKg: '0',
      wac: '0',
    })),
  );

  try {
    await stockBalanceRepo.upsert(stockBalances, ['departmentId', 'stockType']);
  } catch (error) {
    console.warn('Warning: Stock balance seeding failed, skipping...', error);
  }
}
