import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AccountsController } from './accounts.controller';
import { AccountsRepository } from './accounts.repository';
import { AccountsService } from './accounts.service';
import { BankAccount } from './entities/bank-account.entity';
import { CashAccount } from './entities/cash-account.entity';

@Module({
  imports: [TypeOrmModule.forFeature([CashAccount, BankAccount])],
  controllers: [AccountsController],
  providers: [AccountsRepository, AccountsService],
  exports: [AccountsService, AccountsRepository],
})
export class AccountsModule {}
