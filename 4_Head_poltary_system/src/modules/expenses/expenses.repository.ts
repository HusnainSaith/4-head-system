import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DeepPartial } from 'typeorm';
import { Expense } from './entities/expense.entity';
import { ExpenseCategory } from './entities/expense-category.entity';
import { IExpensesRepository } from './interfaces/expenses-repository.interface';

@Injectable()
export class ExpensesRepository implements IExpensesRepository {
  constructor(
    @InjectRepository(Expense)
    private readonly expenseRepo: Repository<Expense>,
    @InjectRepository(ExpenseCategory)
    private readonly categoryRepo: Repository<ExpenseCategory>,
  ) {}

  createExpense(dto: DeepPartial<Expense>): Expense {
    return this.expenseRepo.create(dto) as Expense;
  }

  async saveExpense(expense: Expense): Promise<Expense> {
    return this.expenseRepo.save(expense);
  }

  async findAll(departmentId?: string): Promise<Expense[]> {
    const where: any = { deletedAt: null };
    if (departmentId) where.departmentId = departmentId;
    return this.expenseRepo.find({
      where,
      relations: ['department', 'category'],
      order: { expenseDate: 'DESC', createdAt: 'DESC' },
    });
  }

  async findOne(id: string): Promise<Expense | null> {
    return this.expenseRepo.findOne({ where: { id, deletedAt: null } as any });
  }

  async findCategoryByName(name: string): Promise<ExpenseCategory> {
    return this.categoryRepo.findOneOrFail({ where: { name } });
  }

  findCategories(): Promise<ExpenseCategory[]> {
    return this.categoryRepo.find({
      where: { deletedAt: null } as any,
      order: { name: 'ASC' },
    });
  }
  findCategory(id: string): Promise<ExpenseCategory | null> {
    return this.categoryRepo.findOne({ where: { id, deletedAt: null } as any });
  }
  saveCategory(category: ExpenseCategory): Promise<ExpenseCategory> {
    return this.categoryRepo.save(category);
  }
}
