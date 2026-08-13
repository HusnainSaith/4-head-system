import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LedgerModule } from '../ledger/ledger.module';
import { InvestorCapitalTransaction } from '../investor-management/entities/investor-capital-transaction.entity';
import { InvestorProfitAllocation } from '../investor-management/entities/investor-profit-allocation.entity';
import { Investor } from '../investor-management/entities/investor.entity';
import { Party } from '../parties/entities/party.entity';
import { BrotherController } from './brother.controller';
import { BrotherService } from './brother.service';
import { BrotherAccount } from './entities/brother-account.entity';
import { BrotherFarmAdjustment } from './entities/brother-farm-adjustment.entity';
import { BrotherPayment } from './entities/brother-payment.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      BrotherAccount,
      BrotherFarmAdjustment,
      BrotherPayment,
      Party,
      Investor,
      InvestorCapitalTransaction,
      InvestorProfitAllocation,
    ]),
    LedgerModule,
  ],
  controllers: [BrotherController],
  providers: [BrotherService],
  exports: [BrotherService],
})
export class BrotherModule {}
