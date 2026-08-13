import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Department } from '../departments/entities/department.entity';
import { LedgerModule } from '../ledger/ledger.module';
import { Party } from '../parties/entities/party.entity';
import { ReportsModule } from '../reports/reports.module';
import { InvestorCapitalTransaction } from './entities/investor-capital-transaction.entity';
import { InvestorProfitAllocation } from './entities/investor-profit-allocation.entity';
import { InvestorProfitDistribution } from './entities/investor-profit-distribution.entity';
import { InvestorProfitPeriod } from './entities/investor-profit-period.entity';
import { Investor } from './entities/investor.entity';
import {
  InvestorManagementController,
  InvestorProfitPeriodsController,
} from './investor-management.controller';
import { InvestorManagementService } from './investor-management.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Investor,
      InvestorCapitalTransaction,
      InvestorProfitPeriod,
      InvestorProfitAllocation,
      InvestorProfitDistribution,
      Party,
      Department,
    ]),
    LedgerModule,
    ReportsModule,
  ],
  controllers: [InvestorManagementController, InvestorProfitPeriodsController],
  providers: [InvestorManagementService],
  exports: [InvestorManagementService],
})
export class InvestorManagementModule {}
