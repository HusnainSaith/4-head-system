import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WastageController } from './wastage.controller';
import { WastageService } from './wastage.service';
import { WastageRepository } from './wastage.repository';
import { WastagePurchase } from './entities/wastage-purchase.entity';
import { WastageSale } from './entities/wastage-sale.entity';
import { GuardsModule } from '../../common/modules/guards.module';
import { DepartmentsModule } from '../departments/departments.module';
import { InventoryModule } from '../inventory/inventory.module';
import { LedgerModule } from '../ledger/ledger.module';
import { InvoicesModule } from '../invoices/invoices.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([WastagePurchase, WastageSale]),
    GuardsModule,
    DepartmentsModule,
    InventoryModule,
    LedgerModule,
    InvoicesModule,
    NotificationsModule,
  ],
  controllers: [WastageController],
  providers: [WastageService, WastageRepository],
  exports: [WastageService],
})
export class WastageModule {}
