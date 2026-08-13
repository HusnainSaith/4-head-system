import {
  BadRequestException,
  Injectable,
  NotFoundException,
  Logger,
  Optional,
} from '@nestjs/common';

import { Expense } from './entities/expense.entity';
import { ExpenseCategory } from './entities/expense-category.entity';
import { LedgerService } from '../ledger/ledger.service';
import { ExpensesRepository } from './expenses.repository';
import { InvoicesService } from '../invoices/invoices.service';
import { NotificationsService } from '../notifications/notifications.service';
import { publishBusinessDocument } from '../invoices/business-document.helper';
import { paymentAccountLink } from '../accounts/dto/payment-account-selection.dto';

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
    const expense = this.expensesRepository.createExpense({
      ...dto,
      sourceType: 'manual',
      sourceId: undefined,
      createdBy,
    } as any);
    const saved = await this.expensesRepository.saveExpense(expense);
    const accountLink = paymentAccountLink(dto as Expense);
    await this.ledgerService.post([
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
    ]);
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
    category.name = dto.name;
    category.description = dto.description;
    category.categoryType = dto.categoryType ?? 'miscellaneous';
    category.isActive = true;
    category.isSystemGenerated = false;
    return {
      success: true,
      data: await this.expensesRepository.saveCategory(category),
    };
  }
  async updateCategory(id: string, dto: Partial<ExpenseCategory>) {
    const category = await this.expensesRepository.findCategory(id);
    if (!category) throw new NotFoundException('Expense category not found');
    if (category.isSystemGenerated)
      throw new BadRequestException(
        'System-generated expense categories cannot be edited',
      );
    category.name = dto.name ?? category.name;
    category.description = dto.description ?? category.description;
    category.categoryType = dto.categoryType ?? category.categoryType;
    category.isActive = dto.isActive ?? category.isActive;
    return {
      success: true,
      data: await this.expensesRepository.saveCategory(category),
    };
  }

  async findAll(departmentId?: string) {
    const data = await this.expensesRepository.findAll(departmentId);
    return { success: true, data };
  }

  async findOne(id: string) {
    const e = await this.expensesRepository.findOne(id);
    if (!e) throw new NotFoundException('Expense not found');
    return { success: true, data: e };
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
}
