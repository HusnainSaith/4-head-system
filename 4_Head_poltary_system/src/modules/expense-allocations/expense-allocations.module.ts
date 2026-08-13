import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LedgerModule } from '../ledger/ledger.module';
import { Expense } from '../expenses/entities/expense.entity';
import { ExpenseCategory } from '../expenses/entities/expense-category.entity';
import { ExpenseAllocation } from './entities/expense-allocation.entity';
import { ExpenseAllocationSplit } from './entities/expense-allocation-split.entity';
import { ExpenseAllocationsService } from './expense-allocations.service';
import { ExpenseAllocationsController } from './expense-allocations.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ExpenseAllocation,
      ExpenseAllocationSplit,
      Expense,
      ExpenseCategory,
    ]),
    LedgerModule,
  ],
  providers: [ExpenseAllocationsService],
  controllers: [ExpenseAllocationsController],
  exports: [ExpenseAllocationsService],
})
export class ExpenseAllocationsModule {}
