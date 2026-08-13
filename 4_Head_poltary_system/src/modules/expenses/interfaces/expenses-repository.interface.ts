import { Expense } from '../entities/expense.entity';
import { ExpenseCategory } from '../entities/expense-category.entity';

export interface IExpensesRepository {
  saveExpense(expense: Expense): Promise<Expense>;
  findAll(departmentId?: string): Promise<Expense[]>;
  findOne(id: string): Promise<Expense | null>;
  findCategoryByName(name: string): Promise<ExpenseCategory>;
}
