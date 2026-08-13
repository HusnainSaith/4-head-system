import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PartiesController } from './parties.controller';
import { PartiesService } from './parties.service';
import { PartiesRepository } from './parties.repository';
import { Party } from './entities/party.entity';
import { LedgerModule } from '../ledger/ledger.module';
import { PartyPayment } from './entities/party-payment.entity';
import { InvoicesModule } from '../invoices/invoices.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Party, PartyPayment]),
    LedgerModule,
    InvoicesModule,
    NotificationsModule,
  ],
  controllers: [PartiesController],
  providers: [PartiesService, PartiesRepository],
  exports: [PartiesService],
})
export class PartiesModule {}
