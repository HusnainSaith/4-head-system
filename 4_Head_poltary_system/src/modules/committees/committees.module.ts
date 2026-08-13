import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LedgerModule } from '../ledger/ledger.module';
import { Committee } from './entities/committee.entity';
import { CommitteeInstallment } from './entities/committee-installment.entity';
import { CommitteePayout } from './entities/committee-payout.entity';
import { CommitteesService } from './committees.service';
import {
  CommitteesController,
  CommitteeReportsController,
} from './committees.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Committee,
      CommitteeInstallment,
      CommitteePayout,
    ]),
    LedgerModule,
  ],
  providers: [CommitteesService],
  controllers: [CommitteesController, CommitteeReportsController],
  exports: [CommitteesService],
})
export class CommitteesModule {}
