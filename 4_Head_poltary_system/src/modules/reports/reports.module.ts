import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';
import { ReportsRepository } from './reports.repository';
import { LedgerEntry } from '../ledger/entities/ledger-entry.entity';
import { StockBalance } from '../inventory/entities/stock-balance.entity';
import { Expense } from '../expenses/entities/expense.entity';
import { SalaryRun } from '../employees/entities/salary-run.entity';
import { BrokerageSale } from '../brokerage/entities/brokerage-sale.entity';
import { SupplySale } from '../supply/entities/supply-sale.entity';
import { WastageSale } from '../wastage/entities/wastage-sale.entity';
import { ShopSale } from '../fresh-chicken-shop/entities/shop-sale.entity';
import { InternalTransfer } from '../supply/entities/internal-transfer.entity';
import { StockMovement } from '../inventory/entities/stock-movement.entity';
import { Department } from '../departments/entities/department.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      LedgerEntry,
      StockBalance,
      Expense,
      SalaryRun,
      BrokerageSale,
      SupplySale,
      WastageSale,
      ShopSale,
      InternalTransfer,
      StockMovement,
      Department,
    ]),
  ],
  controllers: [ReportsController],
  providers: [ReportsService, ReportsRepository],
  exports: [ReportsService],
})
export class ReportsModule {}
