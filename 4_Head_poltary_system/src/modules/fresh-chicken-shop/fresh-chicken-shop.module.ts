import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FreshChickenShopController } from './fresh-chicken-shop.controller';
import { FreshChickenShopService } from './fresh-chicken-shop.service';
import { FreshChickenShopRepository } from './fresh-chicken-shop.repository';
import { ShopSale } from './entities/shop-sale.entity';
import { InternalTransfer } from '../supply/entities/internal-transfer.entity';
import { InventoryModule } from '../inventory/inventory.module';
import { LedgerModule } from '../ledger/ledger.module';
import { DepartmentsModule } from '../departments/departments.module';
import { InvoicesModule } from '../invoices/invoices.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { ShopDressingBatch } from './entities/shop-dressing-batch.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([ShopSale, ShopDressingBatch, InternalTransfer]),
    InventoryModule,
    LedgerModule,
    DepartmentsModule,
    InvoicesModule,
    NotificationsModule,
  ],
  controllers: [FreshChickenShopController],
  providers: [FreshChickenShopService, FreshChickenShopRepository],
  exports: [FreshChickenShopService],
})
export class FreshChickenShopModule {}
