import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('chart_of_accounts')
export class ChartOfAccount {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'enum',
    enum: [
      'cash',
      'bank',
      'accounts_receivable',
      'accounts_payable',
      'revenue',
      'cogs',
      'operating_expense',
      'payroll_expense',
      'employee_advance',
      'inventory',
      'employee_salary_payable',
      'committee_advance',
      'other_income',
      'investor_capital',
      'investor_profit_payable',
      'retained_earnings',
      'zakat_fund_clearing',
    ],
    unique: true,
  })
  code:
    | 'cash'
    | 'bank'
    | 'accounts_receivable'
    | 'accounts_payable'
    | 'revenue'
    | 'cogs'
    | 'operating_expense'
    | 'payroll_expense'
    | 'employee_advance'
    | 'inventory'
    | 'employee_salary_payable'
    | 'committee_advance'
    | 'other_income'
    | 'investor_capital'
    | 'investor_profit_payable'
    | 'retained_earnings'
    | 'zakat_fund_clearing';

  @Column({ length: 100 })
  name: string;

  @Column({
    type: 'enum',
    enum: ['asset', 'liability', 'income', 'expense'],
    name: 'account_nature',
  })
  accountNature: 'asset' | 'liability' | 'income' | 'expense';
}
