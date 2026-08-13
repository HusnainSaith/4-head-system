import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LedgerEntry } from './entities/ledger-entry.entity';
import { ChartOfAccount } from './entities/chart-of-account.entity';
import { LedgerRepository } from './ledger.repository';
import { LedgerService } from './ledger.service';

@Module({
  imports: [TypeOrmModule.forFeature([LedgerEntry, ChartOfAccount])],
  providers: [LedgerRepository, LedgerService],
  exports: [LedgerService],
})
export class LedgerModule {}
