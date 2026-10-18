import { ExpensesService } from './expenses.service';

describe('Atomic manual expense posting', () => {
  const dto: any = {
    categoryId: 'category',
    departmentId: 'department',
    amount: '100.00',
    paymentMethod: 'cash',
    cashAccountId: 'admin',
    expenseDate: '2026-10-10',
  };
  it('saves expense and balanced ledger in one transaction', async () => {
    const manager = {};
    const repo: any = {
      findCategory: jest.fn().mockResolvedValue({ isActive: true }),
      transaction: jest.fn(async (work) => work(manager)),
      createExpense: jest.fn((value) => value),
      saveExpense: jest.fn(async (value) => ({ id: 'expense', ...value })),
    };
    const ledger: any = { post: jest.fn() };
    await new ExpensesService(repo, ledger).create(dto, 'actor');
    expect(repo.saveExpense).toHaveBeenCalledWith(expect.anything(), manager);
    expect(ledger.post).toHaveBeenCalledWith(
      [
        expect.objectContaining({
          accountCode: 'operating_expense',
          entryType: 'debit',
          amount: '100.00',
        }),
        expect.objectContaining({
          accountCode: 'cash',
          entryType: 'credit',
          amount: '100.00',
          cashAccountId: 'admin',
        }),
      ],
      manager,
    );
  });
  it('propagates a posting failure to the transaction instead of reporting success', async () => {
    const repo: any = {
      findCategory: jest.fn().mockResolvedValue({ isActive: true }),
      transaction: jest.fn(async (work) => work({})),
      createExpense: jest.fn((value) => value),
      saveExpense: jest.fn(async (value) => ({ id: 'expense', ...value })),
    };
    const ledger: any = {
      post: jest
        .fn()
        .mockRejectedValue(new Error('Admin Cash Drawer is unavailable')),
    };
    await expect(new ExpensesService(repo, ledger).create(dto)).rejects.toThrow(
      'Admin Cash Drawer is unavailable',
    );
  });
});
