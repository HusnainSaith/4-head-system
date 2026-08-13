import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BrokeragePurchase } from '../brokerage/entities/brokerage-purchase.entity';
import { LedgerModule } from '../ledger/ledger.module';
import { Party } from '../parties/entities/party.entity';
import { InvestmentAssignment } from './entities/investment-assignment.entity';
import { InvestmentPayment } from './entities/investment-payment.entity';
import { InvestmentsController } from './investments.controller';
import { InvestmentsService } from './investments.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      InvestmentAssignment,
      InvestmentPayment,
      BrokeragePurchase,
      Party,
    ]),
    LedgerModule,
  ],
  controllers: [InvestmentsController],
  providers: [InvestmentsService],
  exports: [InvestmentsService],
})
export class InvestmentsModule {}
