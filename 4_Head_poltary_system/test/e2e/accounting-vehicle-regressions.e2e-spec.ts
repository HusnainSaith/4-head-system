import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';
import { Department } from '../../src/modules/departments/entities/department.entity';
import { Employee } from '../../src/modules/employees/entities/employee.entity';
import { CashAccount } from '../../src/modules/accounts/entities/cash-account.entity';
import { StockBalance } from '../../src/modules/inventory/entities/stock-balance.entity';
import { StockType } from '../../src/modules/inventory/enums/stock-type.enum';
import {
  Vehicle,
  VehicleTypeEnum,
} from '../../src/modules/vehicles/entities/vehicle.entity';

interface Envelope<T> {
  data: T;
}

describe('Accounting and vehicle persistence regressions', () => {
  let app: INestApplication;
  let agent: ReturnType<typeof request.agent>;
  let dataSource: DataSource;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = module.createNestApplication();
    await app.init();
    dataSource = app.get(DataSource);
    agent = request.agent(app.getHttpServer());
    await agent
      .post('/auth/login')
      .send({ email: 'admin@poultry.local', password: 'Admin@123' })
      .expect(200);
  });

  afterAll(async () => app.close());

  async function vehicleFor(department: Department): Promise<Vehicle> {
    const repository = dataSource.getRepository(Vehicle);
    const existing = await repository.findOne({
      where: { departmentId: department.id, isActive: true },
    });
    if (existing) return existing;
    return repository.save(
      repository.create({
        registrationNumber: `E2E-${department.type}-${Date.now()}`,
        vehicleType: VehicleTypeEnum.TRUCK,
        departmentId: department.id,
        isActive: true,
      }),
    );
  }

  it('persists a department-scoped vehicle on every purchase/sale head', async () => {
    const departments = await dataSource.getRepository(Department).find();
    const byType = new Map(departments.map((item) => [item.type, item]));
    const brokerage = byType.get('BROKERAGE') as Department;
    const supply = byType.get('SUPPLY') as Department;
    const wastage = byType.get('WASTAGE') as Department;
    const shop = byType.get('FRESH_CHICKEN_SHOP') as Department;
    const [brokerageVehicle, supplyVehicle, wastageVehicle, shopVehicle] =
      await Promise.all([
        vehicleFor(brokerage),
        vehicleFor(supply),
        vehicleFor(wastage),
        vehicleFor(shop),
      ]);
    const cashAccounts = await dataSource.getRepository(CashAccount).find();
    const cashByDepartment = new Map(
      cashAccounts.map((account) => [account.departmentId, account.id]),
    );
    const dressedStockRepository = dataSource.getRepository(StockBalance);
    const dressedStock = await dressedStockRepository.findOneByOrFail({
      departmentId: shop.id,
      stockType: StockType.DRESSED,
    });
    if (Number(dressedStock.quantityKg) < 0.001) {
      dressedStock.quantityKg = '1.000';
      dressedStock.wac = '100.0000';
      await dressedStockRepository.save(dressedStock);
    }
    const date = '2026-07-17';

    const brokeragePurchase = (
      (
        await agent
          .post('/brokerage/purchases')
          .send({
            quantityKg: 1,
            ratePerKg: 100,
            amountPaid: 100,
            paymentMethod: 'cash',
            cashAccountId: cashByDepartment.get(brokerage.id),
            purchaseDate: date,
            vehicleId: brokerageVehicle.id,
          })
          .expect(201)
      ).body as Envelope<{ vehicleId: string }>
    ).data;
    const supplyPurchase = (
      (
        await agent
          .post('/supply/purchases')
          .send({
            quantityKg: 1,
            ratePerKg: 100,
            amountPaid: 100,
            paymentMethod: 'cash',
            cashAccountId: cashByDepartment.get(supply.id),
            purchaseDate: date,
            vehicleId: supplyVehicle.id,
          })
          .expect(201)
      ).body as Envelope<{ vehicleId: string }>
    ).data;
    const wastagePurchase = (
      (
        await agent
          .post('/wastage/purchases')
          .send({
            quantityKg: 1,
            ratePerKg: 10,
            amountPaid: 10,
            paymentMethod: 'cash',
            cashAccountId: cashByDepartment.get(wastage.id),
            purchaseDate: date,
            vehicleId: wastageVehicle.id,
          })
          .expect(201)
      ).body as Envelope<{ vehicleId: string }>
    ).data;
    const shopSaleResponse = await agent.post('/shop/sales').send({
      quantityKg: 0.001,
      ratePerKg: 500,
      amountReceived: 0.5,
      paymentMethod: 'cash',
      cashAccountId: cashByDepartment.get(shop.id),
      saleDate: date,
      vehicleId: shopVehicle.id,
    });
    if (shopSaleResponse.status !== 201)
      throw new Error(
        `Shop vehicle sale failed (${shopSaleResponse.status}): ${JSON.stringify(shopSaleResponse.body)}`,
      );
    const shopSale = (shopSaleResponse.body as Envelope<{ vehicleId: string }>)
      .data;

    expect(brokeragePurchase.vehicleId).toBe(brokerageVehicle.id);
    expect(supplyPurchase.vehicleId).toBe(supplyVehicle.id);
    expect(wastagePurchase.vehicleId).toBe(wastageVehicle.id);
    expect(shopSale.vehicleId).toBe(shopVehicle.id);
  });

  it('includes current-month Brokerage payroll in a mid-month report after payment', async () => {
    const department = await dataSource
      .getRepository(Department)
      .findOneByOrFail({ type: 'BROKERAGE' });
    const cashAccount = await dataSource
      .getRepository(CashAccount)
      .findOneByOrFail({ departmentId: department.id });
    const stamp = Date.now();
    const employee = await dataSource.getRepository(Employee).save(
      dataSource.getRepository(Employee).create({
        departmentId: department.id,
        fullName: `Payroll report e2e ${stamp}`,
        designation: 'Tester',
        baseSalary: '35000.00',
        joiningDate: new Date('2026-01-01'),
        isActive: true,
        status: 'active',
      }),
    );
    const reportUrl =
      '/brokerage/reports/profit-loss?from=2026-07-01&to=2026-07-17';
    const before = (
      (await agent.get(reportUrl).expect(200)).body as Envelope<{
        payrollExpenses: string;
      }>
    ).data;
    const run = (
      (
        await agent
          .post('/payroll/runs')
          .send({
            employeeId: employee.id,
            periodMonth: 7,
            periodYear: 2026,
            recoverAdvances: false,
          })
          .expect(201)
      ).body as Envelope<{ id: string }>
    ).data;
    await agent
      .post(`/payroll/runs/${run.id}/pay`)
      .send({
        paidDate: '2026-07-17',
        paymentMethod: 'cash',
        cashAccountId: cashAccount.id,
      })
      .expect(201);
    const after = (
      (await agent.get(reportUrl).expect(200)).body as Envelope<{
        payrollExpenses: string;
      }>
    ).data;

    expect(Number(after.payrollExpenses) - Number(before.payrollExpenses)).toBe(
      35000,
    );
  });
});
