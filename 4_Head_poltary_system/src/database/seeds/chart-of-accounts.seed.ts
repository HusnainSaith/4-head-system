import { DataSource } from 'typeorm';
import { ChartOfAccount } from '../../modules/ledger/entities/chart-of-account.entity';

export async function seedChartOfAccounts(dataSource: DataSource) {
  const chartRepo = dataSource.getRepository(ChartOfAccount);

  const accounts: Partial<ChartOfAccount>[] = [
    { code: 'cash', name: 'Cash', accountNature: 'asset' },
    { code: 'bank', name: 'Bank', accountNature: 'asset' },
    { code: 'inventory', name: 'Inventory', accountNature: 'asset' },
    {
      code: 'accounts_receivable',
      name: 'Accounts Receivable',
      accountNature: 'asset',
    },
    {
      code: 'accounts_payable',
      name: 'Accounts Payable',
      accountNature: 'liability',
    },
    { code: 'revenue', name: 'Revenue', accountNature: 'income' },
    { code: 'cogs', name: 'Cost of Goods Sold', accountNature: 'expense' },
    {
      code: 'operating_expense',
      name: 'Operating Expense',
      accountNature: 'expense',
    },
    {
      code: 'payroll_expense',
      name: 'Payroll Expense',
      accountNature: 'expense',
    },
    {
      code: 'employee_advance',
      name: 'Employee Advance',
      accountNature: 'asset',
    },
    {
      code: 'employee_salary_payable',
      name: 'Employee Salary Payable',
      accountNature: 'liability',
    },
    {
      code: 'committee_advance',
      name: 'Committee Advance',
      accountNature: 'asset',
    },
    { code: 'other_income', name: 'Other Income', accountNature: 'income' },
  ];

  await chartRepo.upsert(accounts, ['code']);
}
