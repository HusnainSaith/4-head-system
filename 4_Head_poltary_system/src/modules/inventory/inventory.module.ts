import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StockMovement } from './entities/stock-movement.entity';
import { TemperatureLog } from './entities/temperature-log.entity';
import { QualityInspection } from './entities/quality-inspection.entity';
import { StockBalance } from './entities/stock-balance.entity';
import { StockWriteoff } from './entities/stock-writeoff.entity';
import { StockMovementController } from './stock-movement.controller';
import { StockMovementService } from './stock-movement.service';
import { StockMovementRepository } from './stock-movement.repository';
import { InventoryRepository } from './inventory.repository';
import { INVENTORY_REPOSITORY } from './interfaces/inventory-repository.interface';
import { InventoryService } from './inventory.service';
import { BatchService } from './batch.service';
import { GuardsModule } from '../../common/modules/guards.module';
import { LedgerModule } from '../ledger/ledger.module';
import { ExpensesModule } from '../expenses/expenses.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      StockMovement,
      TemperatureLog,
      QualityInspection,
      StockBalance,
      StockWriteoff,
    ]),
    GuardsModule,
    LedgerModule,
    ExpensesModule,
  ],
  controllers: [StockMovementController],
  providers: [
    StockMovementService,
    StockMovementRepository,
    InventoryRepository,
    { provide: INVENTORY_REPOSITORY, useClass: InventoryRepository },
    InventoryService,
    BatchService,
  ],
  exports: [InventoryService],
})
export class InventoryModule {}
