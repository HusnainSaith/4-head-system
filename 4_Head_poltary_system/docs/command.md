# Poultry BMS — Targeted Fix Prompt

# Based on Verification Report: 26 failures, 10 passed, 69 files missing

# Work ONE task at a time. Do not proceed until current task is confirmed complete.

---

## ALREADY PASSING — DO NOT TOUCH THESE

- 2.1 Money columns DECIMAL ✅
- 2.2 Quantity DECIMAL(12,3) ✅
- 2.4 Immutable tables no deletedAt ✅
- 2.9 Enum values complete ✅
- 3.6 Ledger entries not updated/deleted ✅
- 3.11 Passwords hashed ✅
- 4.1 Auth endpoints ✅
- 6.4 TypeScript compiles ✅
- 6.5 No console.log ✅
- 6.6 No hardcoded secrets ✅

Do NOT modify anything related to the above. Only work on failures listed below.

---

## MANDATORY WORK PROTOCOL

For every task below:

1. Complete it fully
2. Run `npx tsc --noEmit` — fix any TypeScript errors before moving on
3. Say exactly: `TASK [N] COMPLETE — proceeding to TASK [N+1]`
4. Do NOT start the next task until you have said this

If TypeScript errors appear after a task, fix them before saying TASK COMPLETE.

---

## TASK 1 — Fix 3 quick entity issues (no new files needed)

**1a — Remove hard delete from users.service.ts line 678**
Replace the hard delete call with softDelete:

```
// WRONG (remove this):
await this.usersRepository.delete(id);

// CORRECT (use this):
await this.usersRepository.softDelete(id);
// or: entity.deletedAt = new Date(); await this.usersRepository.save(entity);
```

**1b — Add @Unique(['departmentId']) to stock-balance.entity.ts**

```
@Entity('stock_balances')
@Unique(['departmentId'])   // ← add this line
export class StockBalance { ... }
```

**1c — Fix auth.service.ts lines 8 & 34 — remove @InjectRepository**
In auth.service.ts, remove direct `@InjectRepository(User)` injection.
Instead inject `UsersService` (or `UsersRepository` if that is the pattern used).
Auth service should call `this.usersService.findByEmail(email)` — not query User entity directly.

**1d — Fix users.service.ts — replace permissions guard with owner-only role guard**
In users.controller.ts, replace whatever permissions guard is there with:

```
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('owner')
@Controller('users')
export class UsersController { ... }
```

**1e — Fix parties.controller.ts — add missing endpoints**
Add these routes if missing:

```
@Delete(':id') async remove(@Param('id') id: string) { ... }
@Get(':id/statement') async getStatement(@Param('id') id, @Query() query) { ... }
@Post(':id/payments') async recordPayment(@Param('id') id, @Body() dto) { ... }
```

**1f — Fix stock-movement.controller.ts — add @UseGuards(JwtAuthGuard)**
If this controller still exists, add the guard. If it should not exist (it was part of the deleted nested structure), delete the file and remove it from its module.

Run `npx tsc --noEmit`. Fix all errors.
`TASK 1 COMPLETE — proceeding to TASK 2`

---

## TASK 2 — Create Ledger Module (4 files)

Create these 4 files. This module is the foundation — tasks 3–11 all depend on it.

**`src/modules/ledger/ledger.module.ts`**:

```
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LedgerEntry } from './entities/ledger-entry.entity';
import { ChartOfAccount } from './entities/chart-of-account.entity';
import { LedgerRepository } from './ledger.repository';
import { LedgerService } from './ledger.service';

@Module({
  imports: [TypeOrmModule.forFeature([LedgerEntry, ChartOfAccount])],
  providers: [LedgerRepository, LedgerService],
  exports: [LedgerService],
})
export class LedgerModule {}
```

**`src/modules/ledger/ledger.repository.ts`**:

```
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, EntityManager } from 'typeorm';
import { LedgerEntry } from './entities/ledger-entry.entity';
import { ChartOfAccount } from './entities/chart-of-account.entity';

@Injectable()
export class LedgerRepository {
  constructor(
    @InjectRepository(LedgerEntry)
    private readonly ledgerRepo: Repository<LedgerEntry>,
    @InjectRepository(ChartOfAccount)
    private readonly coaRepo: Repository<ChartOfAccount>,
  ) {}

  async saveEntry(entry: Partial<LedgerEntry>, manager?: EntityManager): Promise<LedgerEntry> {
    const repo = manager ? manager.getRepository(LedgerEntry) : this.ledgerRepo;
    return repo.save(repo.create(entry));
  }

  async saveEntries(entries: Partial<LedgerEntry>[], manager?: EntityManager): Promise<LedgerEntry[]> {
    const repo = manager ? manager.getRepository(LedgerEntry) : this.ledgerRepo;
    return repo.save(entries.map(e => repo.create(e)));
  }

  async findByParty(partyId: string, from: Date, to: Date): Promise<LedgerEntry[]> {
    return this.ledgerRepo.createQueryBuilder('le')
      .where('le.party_id = :partyId', { partyId })
      .andWhere('le.entry_date >= :from', { from })
      .andWhere('le.entry_date <= :to', { to })
      .orderBy('le.entry_date', 'ASC')
      .getMany();
  }

  async findAccountByCode(code: string): Promise<ChartOfAccount> {
    return this.coaRepo.findOneOrFail({ where: { code } });
  }

  async findByDepartmentAndDateRange(
    departmentId: string, from: Date, to: Date, accountCode?: string
  ): Promise<LedgerEntry[]> {
    const qb = this.ledgerRepo.createQueryBuilder('le')
      .leftJoin('le.account', 'acct')
      .where('le.department_id = :departmentId', { departmentId })
      .andWhere('le.entry_date >= :from', { from })
      .andWhere('le.entry_date <= :to', { to });
    if (accountCode) qb.andWhere('acct.code = :accountCode', { accountCode });
    return qb.orderBy('le.entry_date', 'ASC').getMany();
  }
}
```

**`src/modules/ledger/ledger.service.ts`**:

```
import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { LedgerRepository } from './ledger.repository';
import { LedgerEntry } from './entities/ledger-entry.entity';

export interface PostEntryDto {
  departmentId: string;
  accountCode: string;
  partyId?: string;
  entryType: 'debit' | 'credit';
  amount: string; // string to avoid float
  entryDate: Date;
  sourceType: string;
  sourceId: string;
  description?: string;
  createdBy?: string;
}

@Injectable()
export class LedgerService {
  constructor(private readonly ledgerRepo: LedgerRepository) {}

  async post(entries: PostEntryDto[], manager?: EntityManager): Promise<void> {
    const resolved = await Promise.all(
      entries.map(async (dto) => {
        const account = await this.ledgerRepo.findAccountByCode(dto.accountCode);
        return {
          departmentId: dto.departmentId,
          accountId: account.id,
          partyId: dto.partyId,
          entryType: dto.entryType,
          amount: dto.amount,
          entryDate: dto.entryDate,
          sourceType: dto.sourceType,
          sourceId: dto.sourceId,
          description: dto.description,
          createdBy: dto.createdBy,
        };
      })
    );
    await this.ledgerRepo.saveEntries(resolved, manager);
  }

  async getPartyStatement(partyId: string, from: Date, to: Date) {
    const entries = await this.ledgerRepo.findByParty(partyId, from, to);
    let balance = 0;
    const withBalance = entries.map(e => {
      const amt = parseFloat(e.amount as any);
      balance += e.entryType === 'debit' ? amt : -amt;
      return { ...e, runningBalance: balance.toFixed(2) };
    });
    return { entries: withBalance, closingBalance: balance.toFixed(2) };
  }

  async sumByAccount(
    departmentId: string, accountCode: string, from: Date, to: Date, entryType: 'debit' | 'credit'
  ): Promise<string> {
    const entries = await this.ledgerRepo.findByDepartmentAndDateRange(departmentId, from, to, accountCode);
    const sum = entries
      .filter(e => e.entryType === entryType)
      .reduce((acc, e) => acc + parseFloat(e.amount as any), 0);
    return sum.toFixed(2);
  }
}
```

**`src/modules/ledger/dto/create-ledger-entry.dto.ts`**:

```
import { IsUUID, IsEnum, IsDecimal, IsDateString, IsOptional, IsString } from 'class-validator';

export class CreateLedgerEntryDto {
  @IsUUID() departmentId: string;
  @IsUUID() accountId: string;
  @IsOptional() @IsUUID() partyId?: string;
  @IsEnum(['debit', 'credit']) entryType: 'debit' | 'credit';
  @IsDecimal() amount: string;
  @IsDateString() entryDate: string;
  @IsString() sourceType: string;
  @IsUUID() sourceId: string;
  @IsOptional() @IsString() description?: string;
}
```

Add `LedgerModule` to `app.module.ts` imports if not already there.

Run `npx tsc --noEmit`. Fix all errors.
`TASK 2 COMPLETE — proceeding to TASK 3`

---

## TASK 3 — Create Inventory Module (3 files)

**`src/modules/inventory/inventory.repository.ts`**:

```
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, EntityManager } from 'typeorm';
import { StockBalance } from './entities/stock-balance.entity';
import { StockMovement } from './entities/stock-movement.entity';
import { StockWriteoff } from './entities/stock-writeoff.entity';

@Injectable()
export class InventoryRepository {
  constructor(
    @InjectRepository(StockBalance) private readonly balanceRepo: Repository<StockBalance>,
    @InjectRepository(StockMovement) private readonly movementRepo: Repository<StockMovement>,
    @InjectRepository(StockWriteoff) private readonly writeoffRepo: Repository<StockWriteoff>,
  ) {}

  async getBalance(departmentId: string, manager?: EntityManager): Promise<StockBalance> {
    const repo = manager ? manager.getRepository(StockBalance) : this.balanceRepo;
    return repo.findOneOrFail({ where: { departmentId } });
  }

  async updateBalance(departmentId: string, quantityKg: string, weightedAvgCost: string, manager?: EntityManager): Promise<void> {
    const repo = manager ? manager.getRepository(StockBalance) : this.balanceRepo;
    await repo.update({ departmentId }, { quantityKg, weightedAvgCost });
  }

  async saveMovement(movement: Partial<StockMovement>, manager?: EntityManager): Promise<StockMovement> {
    const repo = manager ? manager.getRepository(StockMovement) : this.movementRepo;
    return repo.save(repo.create(movement));
  }

  async saveWriteoff(writeoff: Partial<StockWriteoff>, manager?: EntityManager): Promise<StockWriteoff> {
    const repo = manager ? manager.getRepository(StockWriteoff) : this.writeoffRepo;
    return repo.save(repo.create(writeoff));
  }
}
```

**`src/modules/inventory/inventory.service.ts`**:

```
import { Injectable, BadRequestException } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { InventoryRepository } from './inventory.repository';

@Injectable()
export class InventoryService {
  constructor(private readonly inventoryRepo: InventoryRepository) {}

  // WAC formula — exact implementation required
  private recalculateWac(
    existingQty: number, existingWac: number,
    incomingQty: number, incomingRate: number
  ): number {
    const existingValue = existingQty * existingWac;
    const incomingValue = incomingQty * incomingRate;
    const totalQty = existingQty + incomingQty;
    if (totalQty === 0) return incomingRate;
    return Math.round(((existingValue + incomingValue) / totalQty) * 100) / 100;
  }

  async applyPurchaseIn(
    departmentId: string, quantityKg: number, ratePerKg: number,
    sourceType: string, sourceId: string, movementDate: Date, manager: EntityManager
  ): Promise<{ newQuantity: number; newWac: number }> {
    const balance = await this.inventoryRepo.getBalance(departmentId, manager);
    const existingQty = parseFloat(balance.quantityKg as any);
    const existingWac = parseFloat(balance.weightedAvgCost as any);
    const newWac = this.recalculateWac(existingQty, existingWac, quantityKg, ratePerKg);
    const newQty = existingQty + quantityKg;
    await this.inventoryRepo.updateBalance(departmentId, newQty.toFixed(3), newWac.toFixed(2), manager);
    await this.inventoryRepo.saveMovement({
      departmentId, movementType: 'purchase_in',
      quantityKg: quantityKg.toFixed(3),
      ratePerKg: ratePerKg.toFixed(2),
      resultingWac: newWac.toFixed(2),
      sourceType, sourceId, movementDate,
    }, manager);
    return { newQuantity: newQty, newWac };
  }

  async applySaleOut(
    departmentId: string, quantityKg: number, sourceType: string,
    sourceId: string, movementDate: Date, manager: EntityManager
  ): Promise<{ currentWac: number }> {
    const balance = await this.inventoryRepo.getBalance(departmentId, manager);
    const currentQty = parseFloat(balance.quantityKg as any);
    const currentWac = parseFloat(balance.weightedAvgCost as any);
    // VALIDATE STOCK BEFORE ANY WRITE
    if (quantityKg > currentQty) {
      throw new BadRequestException(
        `Insufficient stock. Available: ${currentQty}kg, Requested: ${quantityKg}kg`
      );
    }
    const newQty = currentQty - quantityKg;
    await this.inventoryRepo.updateBalance(departmentId, newQty.toFixed(3), currentWac.toFixed(2), manager);
    await this.inventoryRepo.saveMovement({
      departmentId, movementType: 'sale_out',
      quantityKg: quantityKg.toFixed(3),
      ratePerKg: currentWac.toFixed(2),
      resultingWac: currentWac.toFixed(2),
      sourceType, sourceId, movementDate,
    }, manager);
    return { currentWac };
  }

  async applyTransferIn(
    departmentId: string, quantityKg: number, internalRatePerKg: number,
    sourceId: string, transferDate: Date, manager: EntityManager
  ): Promise<{ newWac: number }> {
    const balance = await this.inventoryRepo.getBalance(departmentId, manager);
    const existingQty = parseFloat(balance.quantityKg as any);
    const existingWac = parseFloat(balance.weightedAvgCost as any);
    const newWac = this.recalculateWac(existingQty, existingWac, quantityKg, internalRatePerKg);
    const newQty = existingQty + quantityKg;
    await this.inventoryRepo.updateBalance(departmentId, newQty.toFixed(3), newWac.toFixed(2), manager);
    await this.inventoryRepo.saveMovement({
      departmentId, movementType: 'transfer_in',
      quantityKg: quantityKg.toFixed(3),
      ratePerKg: internalRatePerKg.toFixed(2),
      resultingWac: newWac.toFixed(2),
      sourceType: 'internal_transfer', sourceId, movementDate: transferDate,
    }, manager);
    return { newWac };
  }

  async getBalance(departmentId: string) {
    return this.inventoryRepo.getBalance(departmentId);
  }
}
```

**`src/modules/inventory/dto/stock-writeoff.dto.ts`**:

```
import { IsUUID, IsNumber, IsEnum, IsOptional, IsString, IsDateString, IsPositive } from 'class-validator';

export class StockWriteoffDto {
  @IsUUID() departmentId: string;
  @IsNumber() @IsPositive() quantityKg: number;
  @IsEnum(['spoilage', 'mortality', 'transit_loss', 'other']) reason: string;
  @IsOptional() @IsString() note?: string;
  @IsDateString() writeoffDate: string;
}
```

Update `src/modules/inventory/inventory.module.ts` to:

- Add `InventoryRepository` and `InventoryService` to providers
- Export `InventoryService`
- Import `LedgerModule`

Add `InventoryModule` to `app.module.ts` if not there.

Run `npx tsc --noEmit`. Fix all errors.
`TASK 3 COMPLETE — proceeding to TASK 4`

---

## TASK 4 — Complete Vehicles Module (5 missing files)

**`src/modules/vehicles/entities/vehicle-fuel-log.entity.ts`** (extends AuditBaseEntity):

```
@Entity('vehicle_fuel_logs')
export class VehicleFuelLog extends AuditBaseEntity {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ name: 'vehicle_id', type: 'uuid' }) vehicleId: string;
  @ManyToOne(() => Vehicle) @JoinColumn({ name: 'vehicle_id' }) vehicle: Vehicle;
  @Column({ name: 'fuel_date', type: 'date' }) fuelDate: Date;
  @Column({ type: 'decimal', precision: 8, scale: 2 }) liters: string;
  @Column({ name: 'rate_per_liter', type: 'decimal', precision: 10, scale: 2 }) ratePerLiter: string;
  @Column({ name: 'total_amount', type: 'decimal', precision: 12, scale: 2 }) totalAmount: string;
  @Column({ name: 'odometer_reading', type: 'decimal', precision: 10, scale: 1, nullable: true }) odometerReading?: string;
  @Column({ name: 'payment_method', type: 'enum', enum: ['cash', 'bank'] }) paymentMethod: string;
  @Column({ nullable: true }) notes?: string;
}
```

**`src/modules/vehicles/entities/vehicle-maintenance-log.entity.ts`** (extends AuditBaseEntity):

```
@Entity('vehicle_maintenance_logs')
export class VehicleMaintenanceLog extends AuditBaseEntity {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ name: 'vehicle_id', type: 'uuid' }) vehicleId: string;
  @ManyToOne(() => Vehicle) @JoinColumn({ name: 'vehicle_id' }) vehicle: Vehicle;
  @Column({ name: 'maintenance_date', type: 'date' }) maintenanceDate: Date;
  @Column({ name: 'maintenance_type' }) maintenanceType: string;
  @Column({ nullable: true }) description?: string;
  @Column({ type: 'decimal', precision: 12, scale: 2 }) cost: string;
  @Column({ name: 'vendor_name', nullable: true }) vendorName?: string;
  @Column({ name: 'payment_method', type: 'enum', enum: ['cash', 'bank'] }) paymentMethod: string;
}
```

**`src/modules/vehicles/interfaces/vehicles-repository.interface.ts`**:

```
export interface IVehiclesRepository {
  findAll(departmentId?: string): Promise<any[]>;
  findById(id: string): Promise<any>;
  save(data: any): Promise<any>;
  softDelete(id: string): Promise<void>;
  saveFuelLog(data: any, manager?: any): Promise<any>;
  saveMaintenanceLog(data: any, manager?: any): Promise<any>;
}
```

**`src/modules/vehicles/dto/create-fuel-log.dto.ts`**:

```
import { IsNumber, IsPositive, IsEnum, IsOptional, IsDateString } from 'class-validator';
export class CreateFuelLogDto {
  @IsDateString() fuelDate: string;
  @IsNumber() @IsPositive() liters: number;
  @IsNumber() @IsPositive() ratePerLiter: number;
  @IsOptional() @IsNumber() odometerReading?: number;
  @IsEnum(['cash', 'bank']) paymentMethod: string;
  @IsOptional() notes?: string;
}
```

**`src/modules/vehicles/dto/create-maintenance-log.dto.ts`**:

```
import { IsString, IsNumber, IsPositive, IsEnum, IsOptional, IsDateString } from 'class-validator';
export class CreateMaintenanceLogDto {
  @IsDateString() maintenanceDate: string;
  @IsString() maintenanceType: string;
  @IsOptional() @IsString() description?: string;
  @IsNumber() @IsPositive() cost: number;
  @IsOptional() @IsString() vendorName?: string;
  @IsEnum(['cash', 'bank']) paymentMethod: string;
}
```

**Update `vehicles.service.ts`** — add auto-expense creation for fuel and maintenance logs.
The service must inject `ExpensesService` and `LedgerService`.
When creating a fuel log:

```
async createFuelLog(vehicleId: string, dto: CreateFuelLogDto, createdBy: string) {
  return this.dataSource.transaction(async (manager) => {
    // 1. Fetch vehicle to get departmentId
    const vehicle = await manager.findOneOrFail(Vehicle, { where: { id: vehicleId } });
    // 2. Compute totalAmount = liters * ratePerLiter
    const totalAmount = (dto.liters * dto.ratePerLiter).toFixed(2);
    // 3. Save fuel log
    const fuelLog = await manager.save(VehicleFuelLog, { ...dto, vehicleId, totalAmount, createdBy });
    // 4. Auto-create expense
    await this.expensesService.createSystemExpense({
      departmentId: vehicle.departmentId,
      categoryName: 'Vehicle Fuel',
      amount: totalAmount,
      date: new Date(dto.fuelDate),
      sourceType: 'vehicle_fuel',
      sourceId: fuelLog.id,
      createdBy,
    }, manager);
    return fuelLog;
  });
}
```

Same pattern for maintenance logs (category: 'Vehicle Maintenance', sourceType: 'vehicle_maintenance').

**Update `vehicles.controller.ts`** — ensure ALL these routes exist with `@UseGuards(JwtAuthGuard)`:

```
GET/POST  /vehicles
GET/PATCH/DELETE /vehicles/:id
GET/POST  /vehicles/:id/fuel-logs
PATCH/DELETE /vehicles/fuel-logs/:id
GET/POST  /vehicles/:id/maintenance-logs
PATCH/DELETE /vehicles/maintenance-logs/:id
```

Run `npx tsc --noEmit`. Fix all errors.
`TASK 4 COMPLETE — proceeding to TASK 5`

---

## TASK 5 — Create Employees Module (13 files, 0% done)

Create all files in `src/modules/employees/`:

**Entities** (all extend AuditBaseEntity) — implement per the schema below:

`employee.entity.ts`: departmentId FK, fullName, designation?, phone?, cnicOrIdNumber?, baseSalary DECIMAL(12,2), joiningDate DATE, isActive BOOLEAN DEFAULT true.

`employee-advance.entity.ts`: employeeId FK, amount DECIMAL(12,2), advanceDate DATE, reason?, recoveryStatus ENUM('outstanding','partially_recovered','fully_recovered') DEFAULT 'outstanding', amountRecovered DECIMAL(12,2) DEFAULT 0.

`employee-bonus.entity.ts`: employeeId FK, amount DECIMAL(12,2), bonusDate DATE, reason?.

`salary-run.entity.ts`: employeeId FK, periodMonth SMALLINT, periodYear SMALLINT, baseSalary DECIMAL(12,2), totalBonuses DECIMAL(12,2) DEFAULT 0, totalAdvancesDeducted DECIMAL(12,2) DEFAULT 0, netPayable DECIMAL(12,2), paymentStatus ENUM('pending','paid') DEFAULT 'pending', paidDate? DATE, paymentMethod? ENUM('cash','bank'). **Add `@Unique(['employeeId','periodMonth','periodYear'])`**.

**`employees.repository.ts`**: `@InjectRepository` for all 4 entities HERE ONLY.
Methods needed: `findEmployeeById`, `findByDepartment`, `findOutstandingAdvances(employeeId)` — ORDER BY advance_date ASC, `findBonusesForPeriod(employeeId, month, year)`, `findSalaryRun(employeeId, month, year)`, `saveEmployee`, `saveAdvance`, `saveBonus`, `saveSalaryRun`, `updateAdvance`.

**`interfaces/employees-repository.interface.ts`**: IEmployeesRepository interface.

**`employees.service.ts`** — implement salary run logic EXACTLY:

```
async runPayroll(dto: RunPayrollDto, createdBy: string): Promise<SalaryRun> {
  // 1. Check duplicate — throw ConflictException if run exists
  const existing = await this.employeesRepo.findSalaryRun(dto.employeeId, dto.periodMonth, dto.periodYear);
  if (existing) throw new ConflictException(`Salary run already exists for period ${dto.periodMonth}/${dto.periodYear}`);

  const employee = await this.employeesRepo.findEmployeeById(dto.employeeId);
  const baseSalary = parseFloat(employee.baseSalary as any);

  // 2. Sum bonuses for period
  const bonuses = await this.employeesRepo.findBonusesForPeriod(dto.employeeId, dto.periodMonth, dto.periodYear);
  const totalBonuses = bonuses.reduce((sum, b) => sum + parseFloat(b.amount as any), 0);

  // 3. Recover advances oldest-first
  const advances = await this.employeesRepo.findOutstandingAdvances(dto.employeeId);
  let remaining = baseSalary + totalBonuses;
  let totalAdvancesDeducted = 0;
  const advancesToUpdate: Array<{ advance: EmployeeAdvance; newRecovered: number; newStatus: string }> = [];
  for (const advance of advances) {
    if (remaining <= 0) break;
    const outstanding = parseFloat(advance.amount as any) - parseFloat(advance.amountRecovered as any);
    const toRecover = Math.min(outstanding, remaining);
    const newRecovered = parseFloat(advance.amountRecovered as any) + toRecover;
    const newStatus = newRecovered >= parseFloat(advance.amount as any) ? 'fully_recovered' : 'partially_recovered';
    advancesToUpdate.push({ advance, newRecovered, newStatus });
    totalAdvancesDeducted += toRecover;
    remaining -= toRecover;
  }

  const netPayable = baseSalary + totalBonuses - totalAdvancesDeducted;

  return this.dataSource.transaction(async (manager) => {
    // 4. Save salary run
    const run = await manager.save(SalaryRun, {
      employeeId: dto.employeeId,
      periodMonth: dto.periodMonth, periodYear: dto.periodYear,
      baseSalary: baseSalary.toFixed(2),
      totalBonuses: totalBonuses.toFixed(2),
      totalAdvancesDeducted: totalAdvancesDeducted.toFixed(2),
      netPayable: netPayable.toFixed(2),
      paymentStatus: 'pending', createdBy,
    });
    // 5. Update recovered advances
    for (const { advance, newRecovered, newStatus } of advancesToUpdate) {
      await manager.update(EmployeeAdvance, advance.id, {
        amountRecovered: newRecovered.toFixed(2),
        recoveryStatus: newStatus,
      });
    }
    return run;
  });
}

async markSalaryPaid(runId: string, dto: { paidDate: string; paymentMethod: string }, updatedBy: string) {
  return this.dataSource.transaction(async (manager) => {
    const run = await manager.findOneOrFail(SalaryRun, { where: { id: runId }, relations: ['employee'] });
    const gross = (parseFloat(run.baseSalary as any) + parseFloat(run.totalBonuses as any)).toFixed(2);
    const net = run.netPayable;
    const deducted = run.totalAdvancesDeducted;
    // Post ledger entries
    const entries: any[] = [
      { departmentId: run.employee.departmentId, accountCode: 'payroll_expense', entryType: 'debit', amount: gross, entryDate: new Date(dto.paidDate), sourceType: 'salary', sourceId: run.id },
      { departmentId: run.employee.departmentId, accountCode: 'cash', entryType: 'credit', amount: net, entryDate: new Date(dto.paidDate), sourceType: 'salary', sourceId: run.id },
    ];
    if (parseFloat(deducted as any) > 0) {
      entries.push({ departmentId: run.employee.departmentId, accountCode: 'employee_advance', entryType: 'credit', amount: deducted, entryDate: new Date(dto.paidDate), sourceType: 'salary', sourceId: run.id });
    }
    await this.ledgerService.post(entries, manager);
    await manager.update(SalaryRun, runId, { paymentStatus: 'paid', paidDate: dto.paidDate, paymentMethod: dto.paymentMethod, updatedBy });
    return manager.findOneOrFail(SalaryRun, { where: { id: runId } });
  });
}
```

**`employees.controller.ts`** with `@UseGuards(JwtAuthGuard)` at class level:

```
GET/POST         /employees?departmentId=
GET/PATCH/DELETE /employees/:id
GET/POST         /employees/:id/advances
GET/POST         /employees/:id/bonuses
POST             /payroll/runs
GET              /payroll/runs?period=&departmentId=
POST             /payroll/runs/:id/pay
```

**DTOs**: `create-employee.dto.ts`, `create-advance.dto.ts`, `create-bonus.dto.ts`, `run-payroll.dto.ts`.

**`employees.module.ts`**: imports LedgerModule; exports EmployeesService.

Add `EmployeesModule` to `app.module.ts`.

Run `npx tsc --noEmit`. Fix all errors.
`TASK 5 COMPLETE — proceeding to TASK 6`

---

## TASK 6 — Create Expenses Module (complete)

**`src/modules/expenses/expenses.repository.ts`**: `@InjectRepository(Expense)` and `@InjectRepository(ExpenseCategory)` HERE ONLY.

**`src/modules/expenses/interfaces/expenses-repository.interface.ts`**: IExpensesRepository.

**Update `expenses.service.ts`** — remove any `@InjectRepository` from the service. Add this method:

```
async createSystemExpense(data: {
  departmentId: string; categoryName: string; amount: string;
  date: Date; sourceType: string; sourceId: string; createdBy: string;
}, manager: EntityManager): Promise<Expense> {
  const category = await manager.findOneOrFail(ExpenseCategory, { where: { name: data.categoryName } });
  const expense = manager.create(Expense, {
    departmentId: data.departmentId,
    categoryId: category.id,
    amount: data.amount,
    expenseDate: data.date,
    paymentMethod: 'cash', // default; caller can override
    sourceType: data.sourceType as any,
    sourceId: data.sourceId,
    createdBy: data.createdBy,
  });
  const saved = await manager.save(Expense, expense);
  // Post ledger
  await this.ledgerService.post([
    { departmentId: data.departmentId, accountCode: 'operating_expense', entryType: 'debit', amount: data.amount, entryDate: data.date, sourceType: data.sourceType, sourceId: data.sourceId },
    { departmentId: data.departmentId, accountCode: 'cash', entryType: 'credit', amount: data.amount, entryDate: data.date, sourceType: data.sourceType, sourceId: data.sourceId },
  ], manager);
  return saved;
}
```

**`expenses.module.ts`**: imports LedgerModule; exports ExpensesService.

Add `ExpensesModule` to `app.module.ts`.

Run `npx tsc --noEmit`. Fix all errors.
`TASK 6 COMPLETE — proceeding to TASK 7`

---

## TASK 7 — Create Brokerage Module (8 files, 0% done)

All 8 files per the structure: module, controller, service, repository, interface, 2 entities, 2 DTOs.

Key service logic to implement (inside `dataSource.transaction()`):

**createPurchase**: save BrokeragePurchase → `inventoryService.applyPurchaseIn(BROKERAGE_ID, ...)` → `ledgerService.post([debit cogs, credit accounts_payable or cash])`.

**createSale**: `inventoryService.applySaleOut(BROKERAGE_ID, ...)` → snapshot `commissionPerKg = dto.ratePerKg - currentWac` → save BrokerageSale → `ledgerService.post([debit accounts_receivable or cash, credit revenue])`.

**getProfitLoss(from, to)**: query ledger_entries summing revenue credits, cogs debits, operating_expense debits, payroll_expense debits — all scoped to Brokerage departmentId and date range.

Controller endpoints with `@UseGuards(JwtAuthGuard)`:

```
GET/POST         /brokerage/purchases
GET/PATCH/DELETE /brokerage/purchases/:id
GET/POST         /brokerage/sales
GET/PATCH/DELETE /brokerage/sales/:id
GET              /brokerage/stock
POST             /brokerage/stock/writeoffs
GET              /brokerage/reports/profit-loss?from=&to=
```

For the BROKERAGE department UUID: inject `DepartmentsService` and call `findByCode('brokerage')` in the service constructor or `onModuleInit()`. Cache the UUID.

Add `BrokerageModule` to `app.module.ts`.

Run `npx tsc --noEmit`. Fix all errors.
`TASK 7 COMPLETE — proceeding to TASK 8`

---

## TASK 8 — Create Supply Module (9 files, 0% done) — ATOMIC TRANSFER IS CRITICAL

Same structure as Brokerage plus InternalTransfer entity and settle endpoint.

**`internal-transfer.entity.ts`** (extends AuditBaseEntity):

```
@Entity('internal_transfers')
export class InternalTransfer extends AuditBaseEntity {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ name: 'from_department_id', type: 'uuid' }) fromDepartmentId: string;
  @Column({ name: 'to_department_id', type: 'uuid' }) toDepartmentId: string;
  @Column({ name: 'quantity_kg', type: 'decimal', precision: 12, scale: 3 }) quantityKg: string;
  @Column({ name: 'internal_rate_per_kg', type: 'decimal', precision: 14, scale: 2 }) internalRatePerKg: string;
  @Column({ name: 'total_amount', type: 'decimal', precision: 14, scale: 2 }) totalAmount: string;
  @Column({ name: 'settlement_status', type: 'enum', enum: ['unsettled','partially_settled','settled'], default: 'unsettled' }) settlementStatus: string;
  @Column({ name: 'amount_settled', type: 'decimal', precision: 14, scale: 2, default: 0 }) amountSettled: string;
  @Column({ name: 'transfer_date', type: 'date' }) transferDate: Date;
  @Column({ name: 'vehicle_id', type: 'uuid', nullable: true }) vehicleId?: string;
  @Column({ nullable: true }) notes?: string;
}
```

**`supply.service.ts` — createInternalTransfer** (wrap ALL steps in ONE transaction):

```
async createInternalTransfer(dto, createdBy) {
  return this.dataSource.transaction(async (manager) => {
    const qty = parseFloat(dto.quantityKg);
    const rate = parseFloat(dto.internalRatePerKg);
    const totalAmount = (qty * rate).toFixed(2);

    // Step 1: Save transfer record
    const transfer = await manager.save(InternalTransfer, { ...dto, totalAmount, createdBy });

    // Step 2: Supply stock OUT (validates + decrements Supply)
    const { currentWac } = await this.inventoryService.applySaleOut(
      this.supplyDeptId, qty, 'internal_transfer', transfer.id, new Date(dto.transferDate), manager
    );

    // Step 3: Shop stock IN (increments Fresh Chicken Shop)
    await this.inventoryService.applyTransferIn(
      this.shopDeptId, qty, rate, transfer.id, new Date(dto.transferDate), manager
    );

    // Step 4: Post ALL ledger entries for both departments
    const cogsCost = (qty * currentWac).toFixed(2);
    await this.ledgerService.post([
      // Supply side — 3 entries
      { departmentId: this.supplyDeptId, accountCode: 'cogs', entryType: 'debit', amount: cogsCost, entryDate: new Date(dto.transferDate), sourceType: 'internal_transfer', sourceId: transfer.id, createdBy },
      { departmentId: this.supplyDeptId, accountCode: 'revenue', entryType: 'credit', amount: totalAmount, entryDate: new Date(dto.transferDate), sourceType: 'internal_transfer', sourceId: transfer.id, createdBy },
      { departmentId: this.supplyDeptId, accountCode: 'accounts_receivable', partyId: this.shopInternalPartyId, entryType: 'debit', amount: totalAmount, entryDate: new Date(dto.transferDate), sourceType: 'internal_transfer', sourceId: transfer.id, createdBy },
      // Shop side — 2 entries
      { departmentId: this.shopDeptId, accountCode: 'cogs', entryType: 'debit', amount: totalAmount, entryDate: new Date(dto.transferDate), sourceType: 'internal_transfer', sourceId: transfer.id, createdBy },
      { departmentId: this.shopDeptId, accountCode: 'accounts_payable', partyId: this.supplyInternalPartyId, entryType: 'credit', amount: totalAmount, entryDate: new Date(dto.transferDate), sourceType: 'internal_transfer', sourceId: transfer.id, createdBy },
    ], manager);

    return transfer;
  });
  // If any step fails: FULL ROLLBACK — no partial state
}
```

In `supply.service.ts` `onModuleInit()`: resolve `supplyDeptId`, `shopDeptId`, `shopInternalPartyId`, `supplyInternalPartyId` from the database once and cache them.

Controller endpoints with `@UseGuards(JwtAuthGuard)`:

```
GET/POST         /supply/purchases
GET/PATCH/DELETE /supply/purchases/:id
GET/POST         /supply/sales
GET/PATCH/DELETE /supply/sales/:id
GET/POST         /supply/internal-transfers
GET/PATCH        /supply/internal-transfers/:id
POST             /supply/internal-transfers/:id/settle
GET              /supply/stock
POST             /supply/stock/writeoffs
GET              /supply/reports/profit-loss?from=&to=
```

Add `SupplyModule` to `app.module.ts`.

Run `npx tsc --noEmit`. Fix all errors.
`TASK 8 COMPLETE — proceeding to TASK 9`

---

## TASK 9 — Create Wastage Module (8 files, 0% done)

Identical pattern to Brokerage, scoped to Wastage department.
Purchases from: `shop_owner` party type. Sales to: `factory` party type.
No internal transfers. No stock write-offs for Wastage.

Controller endpoints:

```
GET/POST         /wastage/purchases
GET/PATCH/DELETE /wastage/purchases/:id
GET/POST         /wastage/sales
GET/PATCH/DELETE /wastage/sales/:id
GET              /wastage/stock
GET              /wastage/reports/profit-loss?from=&to=
```

Add `WastageModule` to `app.module.ts`.

Run `npx tsc --noEmit`. Fix all errors.
`TASK 9 COMPLETE — proceeding to TASK 10`

---

## TASK 10 — Create Fresh Chicken Shop Module (8 files, 0% done)

Entity: `shop-sale.entity.ts` (extends AuditBaseEntity) — customerPartyId FK, quantityKg DECIMAL(12,3), ratePerKg DECIMAL(14,2), profitMarginPerKg DECIMAL(14,2), totalAmount DECIMAL(14,2), paymentMethod ENUM('cash','bank','credit'), amountReceived DECIMAL(14,2) DEFAULT 0, saleDate DATE, notes?.

Service: createSale wraps in transaction — applySaleOut from shop dept → snapshot profitMarginPerKg = ratePerKg - currentWac → save ShopSale → post ledger.

getIncomingTransfers: read internal_transfers WHERE to_department_id = shopDeptId.

Controller endpoints with `@UseGuards(JwtAuthGuard)`:

```
GET              /shop/incoming-transfers
GET/POST         /shop/sales
GET/PATCH/DELETE /shop/sales/:id
GET              /shop/stock
POST             /shop/stock/writeoffs
GET              /shop/reports/profit-loss?from=&to=
```

Module imports: LedgerModule, InventoryModule, TypeOrmModule.forFeature([ShopSale, InternalTransfer]).

Add `FreshChickenShopModule` to `app.module.ts`.

Run `npx tsc --noEmit`. Fix all errors.
`TASK 10 COMPLETE — proceeding to TASK 11`

---

## TASK 11 — Create Reports Module (4 files, 0% done)

**`reports.service.ts`** — implement all 6 reports. The critical one:

```
async getConsolidatedProfitLoss(from: Date, to: Date) {
  // EXTERNAL revenue only — do NOT include internal_transfers
  const [brokerageRev, supplyRev, wastageRev, shopRev] = await Promise.all([
    this.sumSalesTable('brokerage_sales', 'sale_date', from, to),
    this.sumSalesTable('supply_sales', 'sale_date', from, to),
    this.sumSalesTable('wastage_sales', 'sale_date', from, to),
    this.sumSalesTable('shop_sales', 'sale_date', from, to),
    // internal_transfers intentionally omitted
  ]);
  const externalRevenue = [brokerageRev, supplyRev, wastageRev, shopRev]
    .reduce((a, b) => a + parseFloat(b), 0);

  // Also compute internal transfer total separately (for informational display only)
  const internalTransferRevenue = await this.sumSalesTable('internal_transfers', 'transfer_date', from, to);

  // COGS, expenses, payroll from ledger_entries across all departments
  // ... sum ledger entries by account code and date range ...

  const netProfit = externalRevenue - totalCogs - totalExpenses - totalPayroll;
  return {
    externalRevenue: externalRevenue.toFixed(2),
    internalTransferRevenue, // shown separately, NOT in netProfit calc
    netProfit: netProfit.toFixed(2),
    perPartnerShare: (netProfit / 3).toFixed(2),
  };
}
```

Controller endpoints with `@UseGuards(JwtAuthGuard)`:

```
GET /reports/consolidated-profit-loss?from=&to=
GET /reports/partner-profit-share?from=&to=
GET /reports/outstanding-balances?departmentId=
GET /reports/stock-summary?departmentId=
GET /reports/expense-breakdown?from=&to=&departmentId=
GET /reports/payroll-summary?from=&to=&departmentId=
```

Add `ReportsModule` to `app.module.ts`.

Run `npx tsc --noEmit`. Fix all errors.
`TASK 11 COMPLETE — proceeding to TASK 12`

---

## TASK 12 — Seed Files (4 files)

Create all 4 seed files with upsert pattern (idempotent — safe to run twice).

**`src/database/seeds/departments.seed.ts`** — seeds:

- 4 departments (brokerage, supply, wastage, fresh_chicken_shop)
- 4 internal_department party rows (one per department, linked_department_id set)
- 4 stock_balance rows (one per department, quantity_kg=0, weighted_avg_cost=0)
Use `repository.upsert(data, ['code'])` for departments, `upsert(data, ['name'])` for parties.

**`src/database/seeds/chart-of-accounts.seed.ts`** — 9 rows, upsert on `['code']`.

**`src/database/seeds/expense-categories.seed.ts`** — 7 rows (Rent, Utilities, Office Supplies, Vehicle Fuel isSystemGenerated:true, Vehicle Maintenance isSystemGenerated:true, Wastage Loss isSystemGenerated:true, Miscellaneous), upsert on `['name']`.

**`src/database/seeds/seed.ts`** — runs all 3 seeds in order, then seeds admin user:

```
const existing = await userRepo.findOne({ where: { email: 'admin@poultry.local' } });
if (!existing) {
  const hash = await bcrypt.hash('Admin@123', 12);
  await userRepo.save({ fullName: 'System Admin', email: 'admin@poultry.local', passwordHash: hash, role: 'owner', isActive: true });
}
```

Run `npx tsc --noEmit`. Fix all errors.
`TASK 12 COMPLETE — proceeding to TASK 13`

---

## TASK 13 — Unit Tests (3 files)

Create real unit tests (not empty shells) for:

- `test/unit/inventory.service.spec.ts` — WAC formula, insufficient stock BadRequestException, WAC unchanged on sale
- `test/unit/employees.service.spec.ts` — net_payable formula, FIFO advance recovery, ConflictException on duplicate run
- `test/unit/ledger.service.spec.ts` — all posting rule types produce correct debit/credit pairs

Run `npm run test`. Fix all test failures.
`TASK 13 COMPLETE`

---

## TASK 14 — Final Verification Checks

Run each of these and fix any remaining issues:

```
# 1. TypeScript
npx tsc --noEmit

# 2. Unit tests
npm run test

# 3. Verify app.module.ts has exactly these 15 module imports (nothing else):
# AuthModule, UsersModule, DepartmentsModule, PartiesModule, LedgerModule,
# InventoryModule, VehiclesModule, EmployeesModule, ExpensesModule,
# BrokerageModule, SupplyModule, WastageModule, FreshChickenShopModule,
# ReportsModule, DatabaseModule/TypeOrmModule

# 4. Confirm no @InjectRepository in any *.service.ts file:
grep -rn "@InjectRepository" src/modules/*/\*.service.ts
# must return 0 results

# 5. Confirm JwtAuthGuard on all controllers except auth:
grep -rL "JwtAuthGuard" src/modules/*/\*.controller.ts
# auth.controller.ts is the only acceptable result
```

When all pass, output EXACTLY:

```
READY FOR VERIFICATION
Tasks completed: 14/14
TypeScript: 0 errors
Unit tests: 0 failures
```