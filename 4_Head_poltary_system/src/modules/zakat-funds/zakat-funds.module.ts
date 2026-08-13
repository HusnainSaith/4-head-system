import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LedgerModule } from '../ledger/ledger.module';
import { ZakatFundPayment } from './entities/zakat-fund-payment.entity';
import { ZakatFundSettlementSplit } from './entities/zakat-fund-settlement-split.entity';
import { ZakatFundSettlement } from './entities/zakat-fund-settlement.entity';
import { ZakatFundsController } from './zakat-funds.controller';
import { ZakatFundsService } from './zakat-funds.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ZakatFundPayment,
      ZakatFundSettlement,
      ZakatFundSettlementSplit,
    ]),
    LedgerModule,
  ],
  controllers: [ZakatFundsController],
  providers: [ZakatFundsService],
})
export class ZakatFundsModule {}
