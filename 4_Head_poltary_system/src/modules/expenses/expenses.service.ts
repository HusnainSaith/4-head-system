import {
  BadRequestException,
  Injectable,
  NotFoundException,
  Logger,
  Optional,
  ConflictException,
} from '@nestjs/common';

import { Expense } from './entities/expense.entity';
import { ExpenseCategory } from './entities/expense-category.entity';
import { LedgerService } from '../ledger/ledger.service';
import { ExpensesRepository } from './expenses.repository';
import { InvoicesService } from '../invoices/invoices.service';
import { NotificationsService } from '../notifications/notifications.service';
import { publishBusinessDocument } from '../invoices/business-document.helper';
import { paymentAccountLink } from '../accounts/dto/payment-account-selection.dto';
import { UpdateExpenseDto } from './dto/update-expense.dto';

@Injectable()
export class ExpensesService {
  private readonly logger = new Logger(ExpensesService.name);
  constructor(
    private readonly expensesRepository: ExpensesRepository,
    private readonly ledgerService: LedgerService,
    @Optional() private readonly invoicesService?: InvoicesService,
    @Optional() private readonly notificationsService?: NotificationsService,
  ) {}

  async create(dto: Partial<Expense>, createdBy?: string) {
    await this.requireActiveCategory(dto.categoryId!);
    const accountLink = paymentAccountLink(dto as Expense);
    const saved = await this.expensesRepository.transaction(async (manager) => {
      const expense = this.expensesRepository.createExpense(
        {
          ...dto,
          sourceType: 'manual',
          sourceId: undefined,
          createdBy,
        } as any,
        manager,
      );
      const saved = await this.expensesRepository.saveExpense(expense, manager);
      await this.ledgerService.post(
        [
          {
            departmentId: saved.departmentId,
            accountCode: 'operating_expense',
            entryType: 'debit',
            amount: saved.amount,
            entryDate: new Date(saved.expenseDate),
            sourceType: 'expense',
            sourceId: saved.id,
            createdBy,
          },
          {
            departmentId: saved.departmentId,
            accountCode: saved.paymentMethod,
            entryType: 'credit',
            amount: saved.amount,
            entryDate: new Date(saved.expenseDate),
            sourceType: 'expense',
            sourceId: saved.id,
            createdBy,
            ...accountLink,
          },
        ],
        manager,
      );
      return saved;
    });
    if (this.invoicesService && this.notificationsService && createdBy)
      await publishBusinessDocument(
        this.invoicesService,
        this.notificationsService,
        {
          invoiceType: 'expense',
          departmentId: saved.departmentId,
          sourceType: 'expense',
          sourceId: saved.id,
          lineItems: [
            {
              description: saved.description ?? 'Operating Expense',
              qty: 1,
              unit: 'expense',
              rate: Number(saved.amount),
              amount: Number(saved.amount),
            },
          ],
          subtotal: Number(saved.amount),
          totalAmount: Number(saved.amount),
          notes: saved.description,
          issuedAt: new Date(saved.expenseDate).toISOString(),
        },
        createdBy,
        {
          type: 'expense',
          title: 'Expense Recorded',
          message: saved.description ?? 'Operating expense recorded',
          context: {
            category: saved.categoryId,
            amount: saved.amount,
            date: String(saved.expenseDate),
            status: saved.isApproved ? 'Approved' : 'Recorded',
          },
        },
        this.logger,
      );
    return { success: true, message: 'Expense created', data: saved };
  }

  async getCategories() {
    return {
      success: true,
      data: await this.expensesRepository.findCategories(),
    };
  }
  async createCategory(dto: {
    name: string;
    description?: string;
    categoryType?: ExpenseCategory['categoryType'];
  }) {
    const category = new ExpenseCategory();
    category.name = dto.name.trim();
    await this.validateCategoryName(category.name);
    category.description = dto.description;
    category.categoryType = dto.categoryType ?? 'miscellaneous';
    category.isActive = true;
    category.isSystemGenerated = false;
    return {
      success: true,
      data: await this.saveCategory(category),
    };
  }
  async updateCategory(id: string, dto: Partial<ExpenseCategory>) {
    const category = await this.expensesRepository.findCategory(id);
    if (!category) throw new NotFoundException('Expense category not found');
    if (category.isSystemGenerated)
      throw new BadRequestException(
        'System-generated expense categories cannot be edited',
      );
    if (dto.name !== undefined)
      await this.validateCategoryName(dto.name.trim(), id);
    category.name = dto.name?.trim() ?? category.name;
    category.description = dto.description ?? category.description;
    category.categoryType = dto.categoryType ?? category.categoryType;
    category.isActive = dto.isActive ?? category.isActive;
    return {
      success: true,
      data: await this.expensesRepository.saveCategory(category),
    };
  }

  private async saveCategory(category: ExpenseCategory) {
    try {
      return await this.expensesRepository.saveCategory(category);
    } catch (error) {
      if ((error as { code?: string }).code === '23505')
        throw new ConflictException(
          'An expense category with this name already exists',
        );
      throw error;
    }
  }

  async getCategory(id: string) {
    const category = await this.expensesRepository.findCategory(id);
    if (!category) throw new NotFoundException('Expense category not found');
    return { success: true, data: category };
  }

  private async validateCategoryName(name: string, id?: string) {
    if (!name || name.length > 100)
      throw new BadRequestException(
        'Category name must contain 1 to 100 characters',
      );
    const existing = await this.expensesRepository.findCategoryWithName(name);
    if (existing && existing.id !== id)
      throw new ConflictException(
        'An expense category with this name already exists',
      );
  }

  private async requireActiveCategory(id: string) {
    const { data } = await this.getCategory(id);
    if (!data.isActive)
      throw new BadRequestException('Expense category is inactive');
  }

  async deleteCategory(id: string) {
    const { data } = await this.getCategory(id);
    if (data.isSystemGenerated)
      throw new BadRequestException(
        'System-generated expense categories cannot be deleted',
      );
    if (await this.expensesRepository.countCategoryExpenses(id))
      throw new BadRequestException(
        'Category is used by expenses; deactivate it instead',
      );
    await this.expensesRepository.deleteCategory(id);
    return { success: true, message: 'Expense category deleted', data: null };
  }

  async findAll(departmentId?: string) {
    const data = await this.expensesRepository.findAll(departmentId);
    return { success: true, data };
  }

  sumTotal(departmentId: string, from?: string, to?: string) {
    return this.expensesRepository.sumTotal(departmentId, from, to);
  }

  async findOne(id: string) {
    const e = await this.expensesRepository.findOne(id);
    if (!e) throw new NotFoundException('Expense not found');
    return { success: true, data: e };
  }

  async update(id: string, dto: UpdateExpenseDto, updatedBy?: string) {
    return this.expensesRepository.transaction(async (manager) => {
      const expense = await this.expensesRepository.findOne(id, manager);
      if (!expense) throw new NotFoundException('Expense not found');
      if (expense.sourceType !== 'manual')
        throw new BadRequestException('Only manual expenses can be edited');
      if (dto.categoryId && dto.categoryId !== expense.categoryId)
        await this.requireActiveCategory(dto.categoryId);
      paymentAccountLink({ ...expense, ...dto });

      const entryDate = new Date(dto.expenseDate ?? expense.expenseDate);
      const oldEntries = await this.ledgerService.findBySource(
        'expense',
        id,
        manager,
      );
      if (oldEntries.length)
        await this.ledgerService.post(
          oldEntries.map((entry) => ({
            departmentId: entry.departmentId,
            accountCode: entry.account.code,
            entryType: entry.entryType === 'debit' ? 'credit' : 'debit',
            amount: entry.amount,
            entryDate,
            sourceType: 'expense' as const,
            sourceId: id,
            description: `Expense edit reversal ${id}`,
            createdBy: updatedBy,
            cashAccountId: entry.cashAccountId,
            bankAccountId: entry.bankAccountId,
          })),
          manager,
          true,
        );

      Object.assign(expense, dto, {
        expenseDate: dto.expenseDate
          ? new Date(dto.expenseDate)
          : expense.expenseDate,
        updatedBy,
      });
      const saved = await this.expensesRepository.saveExpense(expense, manager);
      const accountLink = paymentAccountLink(saved);
      await this.ledgerService.post(
        [
          {
            departmentId: saved.departmentId,
            accountCode: 'operating_expense',
            entryType: 'debit',
            amount: saved.amount,
            entryDate,
            sourceType: 'expense',
            sourceId: saved.id,
            description: saved.description,
            createdBy: updatedBy,
          },
          {
            departmentId: saved.departmentId,
            accountCode: saved.paymentMethod,
            entryType: 'credit',
            amount: saved.amount,
            entryDate,
            sourceType: 'expense',
            sourceId: saved.id,
            description: saved.description,
            createdBy: updatedBy,
            ...accountLink,
          },
        ],
        manager,
      );
      return { success: true, message: 'Expense updated', data: saved };
    });
  }

  async createSystemExpense(
    data: {
      departmentId: string;
      categoryName: string;
      amount: string;
      date: Date;
      sourceType: string;
      sourceId: string;
      createdBy: string;
      description?: string;
      offsetAccountCode?: 'cash' | 'inventory';
    },
    manager: any,
  ): Promise<Expense> {
    const category = await manager.findOneOrFail(ExpenseCategory, {
      where: { name: data.categoryName } as any,
    });
    const expense = manager.create(Expense, {
      departmentId: data.departmentId,
      categoryId: category.id,
      amount: data.amount,
      expenseDate: data.date,
      paymentMethod: 'cash' as any,
      sourceType: data.sourceType as any,
      sourceId: data.sourceId,
      createdBy: data.createdBy,
      description: data.description,
    });
    const saved = await manager.save(Expense, expense);

    await this.ledgerService.post(
      [
        {
          departmentId: data.departmentId,
          accountCode: 'operating_expense',
          entryType: 'debit',
          amount: data.amount,
          entryDate: data.date,
          sourceType: 'expense',
          sourceId: saved.id,
          createdBy: data.createdBy,
        },
        {
          departmentId: data.departmentId,
          accountCode: data.offsetAccountCode ?? 'cash',
          entryType: 'credit',
          amount: data.amount,
          entryDate: data.date,
          sourceType: 'expense',
          sourceId: saved.id,
          createdBy: data.createdBy,
        },
      ],
      manager,
    );

    return saved;
  }

  async reverseSystemExpenses(
    sourceType: string,
    sourceId: string,
    actorId: string,
    manager: any,
  ): Promise<void> {
    const expenses = await manager.find(Expense, {
      where: { sourceType, sourceId, deletedAt: null } as any,
    });
    for (const expense of expenses) {
      await this.ledgerService.reverseSource(
        'expense',
        expense.id,
        actorId,
        manager,
      );
      await manager.update(Expense, expense.id, {
        deletedAt: new Date(),
        updatedBy: actorId,
      });
    }
  }
}
