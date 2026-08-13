import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Expense } from './entities/expense.entity';
import { ExpenseCategory } from './entities/expense-category.entity';
import { ExpensesService } from './expenses.service';
import { ExpensesController } from './expenses.controller';
import { ExpensesRepository } from './expenses.repository';
import { LedgerModule } from '../ledger/ledger.module';
import { InvoicesModule } from '../invoices/invoices.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Expense, ExpenseCategory]),
    LedgerModule,
    InvoicesModule,
    NotificationsModule,
  ],
  controllers: [ExpensesController],
  providers: [ExpensesService, ExpensesRepository],
  exports: [ExpensesService],
})
export class ExpensesModule {}
