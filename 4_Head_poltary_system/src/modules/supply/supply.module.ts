import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SupplyController } from './supply.controller';
import { SupplyService } from './supply.service';
import { SupplyRepository } from './supply.repository';
import { SupplyPurchase } from './entities/supply-purchase.entity';
import { SupplySale } from './entities/supply-sale.entity';
import { InternalTransfer } from './entities/internal-transfer.entity';
import { Party } from '../parties/entities/party.entity';
import { GuardsModule } from '../../common/modules/guards.module';
import { DepartmentsModule } from '../departments/departments.module';
import { InventoryModule } from '../inventory/inventory.module';
import { LedgerModule } from '../ledger/ledger.module';
import { Vehicle } from '../vehicles/entities/vehicle.entity';
import { ExpensesModule } from '../expenses/expenses.module';
import { InvoicesModule } from '../invoices/invoices.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      SupplyPurchase,
      SupplySale,
      InternalTransfer,
      Party,
      Vehicle,
    ]),
    GuardsModule,
    DepartmentsModule,
    InventoryModule,
    LedgerModule,
    ExpensesModule,
    InvoicesModule,
    NotificationsModule,
  ],
  controllers: [SupplyController],
  providers: [SupplyService, SupplyRepository],
  exports: [SupplyService],
})
export class SupplyModule {}
