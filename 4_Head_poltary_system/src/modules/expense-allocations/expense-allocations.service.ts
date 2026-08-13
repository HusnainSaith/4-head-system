import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { LedgerService } from '../ledger/ledger.service';
import { Expense } from '../expenses/entities/expense.entity';
import { ExpenseCategory } from '../expenses/entities/expense-category.entity';
import { CreateExpenseAllocationDto } from './dto/create-expense-allocation.dto';
import { ExpenseAllocation } from './entities/expense-allocation.entity';
import { ExpenseAllocationSplit } from './entities/expense-allocation-split.entity';

@Injectable()
export class ExpenseAllocationsService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly ledger: LedgerService,
  ) {}

  calculateSplits(
    dto: Pick<
      CreateExpenseAllocationDto,
      'totalAmount' | 'allocationMethod' | 'splits'
    >,
  ) {
    const totalCents = Math.round(dto.totalAmount * 100);
    if (
      new Set(dto.splits.map((s) => s.departmentId)).size !== dto.splits.length
    )
      throw new BadRequestException('A department can only appear once');
    let cents: number[];
    if (dto.allocationMethod === 'equal') {
      const base = Math.floor(totalCents / dto.splits.length);
      cents = dto.splits.map((_, index) =>
        index === dto.splits.length - 1
          ? totalCents - base * (dto.splits.length - 1)
          : base,
      );
    } else if (dto.allocationMethod === 'percentage') {
      const percentages = dto.splits.map((s) => s.percentage ?? 0);
      if (Math.abs(percentages.reduce((a, b) => a + b, 0) - 100) > 0.000001)
        throw new BadRequestException('Percentages must total 100');
      cents = percentages.map((p, index) =>
        index === percentages.length - 1
          ? 0
          : Math.round((totalCents * p) / 100),
      );
      cents[cents.length - 1] =
        totalCents - cents.slice(0, -1).reduce((a, b) => a + b, 0);
    } else {
      cents = dto.splits.map((s) => Math.round((s.amount ?? 0) * 100));
      if (cents.reduce((a, b) => a + b, 0) !== totalCents)
        throw new BadRequestException(
          'Manual splits must equal the total amount',
        );
    }
    if (cents.some((value) => value <= 0))
      throw new BadRequestException('Every split must be positive');
    return dto.splits.map((split, index) => ({
      departmentId: split.departmentId,
      splitAmount: (cents[index] / 100).toFixed(2),
    }));
  }

  list() {
    return this.dataSource.getRepository(ExpenseAllocation).find({
      where: { deletedAt: null as any },
      relations: ['splits', 'splits.department', 'category'],
      order: { expenseDate: 'DESC' },
    });
  }
  async findOne(id: string) {
    const item = await this.dataSource
      .getRepository(ExpenseAllocation)
      .findOne({
        where: { id, deletedAt: null as any },
        relations: ['splits', 'splits.department', 'category'],
      });
    if (!item) throw new NotFoundException('Expense allocation not found');
    return item;
  }

  create(dto: CreateExpenseAllocationDto, actorId: string) {
    const calculated = this.calculateSplits(dto);
    return this.dataSource.transaction(async (manager) => {
      await manager.findOneOrFail(ExpenseCategory, {
        where: { id: dto.categoryId, deletedAt: null as any },
      });
      const allocation = await manager.save(
        ExpenseAllocation,
        manager.create(ExpenseAllocation, {
          categoryId: dto.categoryId,
          totalAmount: dto.totalAmount.toFixed(2),
          allocationMethod: dto.allocationMethod,
          expenseDate: dto.expenseDate,
          description: dto.description,
          createdBy: actorId,
          updatedBy: actorId,
        }),
      );
      const splits = await manager.save(
        ExpenseAllocationSplit,
        calculated.map((split) =>
          manager.create(ExpenseAllocationSplit, {
            allocationId: allocation.id,
            departmentId: split.departmentId,
            splitAmount: split.splitAmount,
            createdBy: actorId,
            updatedBy: actorId,
          }),
        ),
      );
      for (const split of splits) {
        const expense = await manager.save(
          Expense,
          manager.create(Expense, {
            departmentId: split.departmentId,
            categoryId: dto.categoryId,
            amount: split.splitAmount,
            expenseDate: new Date(dto.expenseDate),
            sourceType: 'allocation',
            sourceId: allocation.id,
            description: dto.description,
            createdBy: actorId,
            updatedBy: actorId,
          }),
        );
        await this.ledger.post(
          [
            {
              departmentId: split.departmentId,
              accountCode: 'operating_expense',
              entryType: 'debit',
              amount: split.splitAmount,
              entryDate: new Date(dto.expenseDate),
              sourceType: 'expense',
              sourceId: expense.id,
              createdBy: actorId,
            },
            {
              departmentId: split.departmentId,
              accountCode: 'cash',
              entryType: 'credit',
              amount: split.splitAmount,
              entryDate: new Date(dto.expenseDate),
              sourceType: 'expense',
              sourceId: expense.id,
              createdBy: actorId,
            },
          ],
          manager,
        );
      }
      return { ...allocation, splits };
    });
  }

  remove(id: string, actorId: string) {
    return this.dataSource.transaction(async (manager) => {
      const allocation = await manager
        .getRepository(ExpenseAllocation)
        .findOne({ where: { id, deletedAt: null as any } });
      if (!allocation)
        throw new NotFoundException('Expense allocation not found');
      const expenses = await manager.getRepository(Expense).find({
        where: {
          sourceType: 'allocation' as any,
          sourceId: id,
          deletedAt: null as any,
        },
      });
      for (const expense of expenses)
        await this.ledger.reverseSource(
          'expense',
          expense.id,
          actorId,
          manager,
        );
      const now = new Date();
      await manager
        .getRepository(Expense)
        .update(
          { sourceType: 'allocation' as any, sourceId: id },
          { deletedAt: now, updatedBy: actorId },
        );
      await manager
        .getRepository(ExpenseAllocationSplit)
        .update({ allocationId: id }, { deletedAt: now, updatedBy: actorId });
      await manager
        .getRepository(ExpenseAllocation)
        .update(id, { deletedAt: now, updatedBy: actorId });
      return { id, deleted: true };
    });
  }
}
