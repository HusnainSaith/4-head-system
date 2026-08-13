import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BrokerageController } from './brokerage.controller';
import { BrokerageService } from './brokerage.service';
import { BrokerageRepository } from './brokerage.repository';
import { BrokeragePurchase } from './entities/brokerage-purchase.entity';
import { BrokerageSale } from './entities/brokerage-sale.entity';
import { GuardsModule } from '../../common/modules/guards.module';
import { DepartmentsModule } from '../departments/departments.module';
import { InventoryModule } from '../inventory/inventory.module';
import { LedgerModule } from '../ledger/ledger.module';
import { ExpensesModule } from '../expenses/expenses.module';
import { InvoicesModule } from '../invoices/invoices.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { SupplyPurchase } from '../supply/entities/supply-purchase.entity';
import { Party } from '../parties/entities/party.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      BrokeragePurchase,
      BrokerageSale,
      SupplyPurchase,
      Party,
    ]),
    GuardsModule,
    DepartmentsModule,
    InventoryModule,
    LedgerModule,
    ExpensesModule,
    InvoicesModule,
    NotificationsModule,
  ],
  controllers: [BrokerageController],
  providers: [BrokerageService, BrokerageRepository],
  exports: [BrokerageService],
})
export class BrokerageModule {}
