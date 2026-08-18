import { BadRequestException, Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { AccountsRepository } from './accounts.repository';
import { CreateBankAccountDto } from './dto/create-bank-account.dto';
import { UpdateBankAccountDto } from './dto/update-bank-account.dto';
import { CashAdjustmentDto, CashAdjustmentType } from './dto/cash-adjustment.dto';
import { BankAccount } from './entities/bank-account.entity';
import { CashAccount } from './entities/cash-account.entity';

type BalanceRow = {
  account_id: string;
  total_in: string;
  total_out: string;
  cheque_in: string;
  cheque_out: string;
  app_in: string;
  app_out: string;
};

@Injectable()
export class AccountsService {
  constructor(
    private readonly accountsRepo: AccountsRepository,
    private readonly dataSource: DataSource,
  ) {}

  async getCashAccountBalance(departmentId: string) {
    const account = await this.accountsRepo.findCashByDepartment(departmentId);
    const [row] = await this.cashTotals([account.id]);
    return this.cashBalance(account, row);
  }

  async getAllCashBalances() {
    const accounts = await this.accountsRepo.findAllCashAccounts();
    if (!accounts.length) return [];
    const totals = await this.cashTotals(accounts.map(({ id }) => id));
    const byId = new Map(totals.map((row) => [row.account_id, row]));
    return accounts.map((account) =>
      this.cashBalance(account, byId.get(account.id)),
    );
  }

  async createBankAccount(
    dto: CreateBankAccountDto,
    createdBy: string,
  ): Promise<BankAccount> {
    return this.dataSource.transaction(async (manager) => {
      const account = await manager.save(
        BankAccount,
        manager.create(BankAccount, {
          ...dto,
          openingBalance: this.money(dto.openingBalance ?? 0),
          openingBalanceDate: dto.openingBalanceDate
            ? new Date(dto.openingBalanceDate)
            : undefined,
          createdBy,
        }),
      );
      if ((dto.openingBalance ?? 0) > 0) {
        await manager.query(
          `INSERT INTO ledger_entries
            (id, department_id, account_id, entry_type, amount, entry_date,
             source_type, source_id, bank_account_id, description, created_by)
           VALUES (gen_random_uuid(), (SELECT id FROM departments WHERE is_active = true ORDER BY created_at LIMIT 1),
             (SELECT id FROM chart_of_accounts WHERE code = 'bank'), 'debit', $1, $2,
             'opening_balance', $3, $3, $4, $5)`,
          [
            account.openingBalance,
            dto.openingBalanceDate ?? new Date(),
            account.id,
            `Opening balance - ${account.bankName} ${account.accountTitle}`,
            createdBy,
          ],
        );
      }
      return account;
    });
  }

  async getBankAccountBalance(bankAccountId: string) {
    const account = await this.accountsRepo.findBankById(bankAccountId);
    const [row] = await this.bankTotals([bankAccountId]);
    return this.bankBalance(account, row);
  }

  async getAllBankBalances() {
    const accounts = await this.accountsRepo.findAllBankAccounts();
    if (!accounts.length) return [];
    const totals = await this.bankTotals(accounts.map(({ id }) => id));
    const byId = new Map(totals.map((row) => [row.account_id, row]));
    return accounts.map((account) =>
      this.bankBalance(account, byId.get(account.id)),
    );
  }

  async getBankAccountStatement(
    bankAccountId: string,
    from: Date,
    to: Date,
    method?: 'cheque' | 'app',
  ) {
    this.validateRange(from, to);
    const account = await this.accountsRepo.findBankById(bankAccountId);
    const prior = await this.priorBalance(
      'bank_account_id',
      bankAccountId,
      from,
    );
    const parameters: unknown[] = [bankAccountId, from, to];
    const methodClause = method ? ` AND le.bank_transaction_method = $4` : '';
    if (method) parameters.push(method);
    const rows = await this.dataSource.query(
      `SELECT le.id, le.entry_type, le.amount, le.entry_date, le.source_type,
              le.source_id, le.description, le.bank_transaction_method,
              le.cheque_number, le.app_reference, le.created_at
         FROM ledger_entries le
        WHERE le.bank_account_id = $1 AND le.source_type <> 'opening_balance'
          AND le.entry_date >= $2 AND le.entry_date <= $3${methodClause}
        ORDER BY le.entry_date, le.created_at, le.id`,
      parameters,
    );
    return this.statement(
      account,
      rows,
      Number(account.openingBalance) + prior,
    );
  }

  async getCashAccountStatement(cashAccountId: string, from: Date, to: Date) {
    this.validateRange(from, to);
    const account = await this.accountsRepo.findCashById(cashAccountId);
    const prior = await this.priorBalance('cash_account_id', account.id, from);
    const rows = await this.dataSource.query(
      `SELECT le.id, le.entry_type, le.amount, le.entry_date, le.source_type,
              le.source_id, le.description, le.created_at
         FROM ledger_entries le
        WHERE le.cash_account_id = $1 AND le.source_type <> 'opening_balance'
          AND le.entry_date >= $2 AND le.entry_date <= $3
        ORDER BY le.entry_date, le.created_at, le.id`,
      [account.id, from, to],
    );
    return this.statement(
      account,
      rows,
      Number(account.openingBalance) + prior,
    );
  }

  async getFullCashBankSummary() {
    const [cashAccounts, bankAccounts] = await Promise.all([
      this.getAllCashBalances(),
      this.getAllBankBalances(),
    ]);
    const totalCash = cashAccounts.reduce(
      (sum, item) => sum + Number(item.currentBalance),
      0,
    );
    const totalBank = bankAccounts.reduce(
      (sum, item) => sum + Number(item.currentBalance),
      0,
    );
    return {
      totalCash: this.money(totalCash),
      totalBank: this.money(totalBank),
      totalFunds: this.money(totalCash + totalBank),
      cashAccounts,
      bankAccounts,
    };
  }

  updateBankAccount(
    id: string,
    dto: UpdateBankAccountDto,
    updatedBy: string,
  ): Promise<void> {
    return this.accountsRepo.updateBankAccount(id, { ...dto, updatedBy });
  }

  async adjustCashDrawer(
    cashAccountId: string,
    dto: CashAdjustmentDto,
    actorId: string,
  ) {
    const account = await this.accountsRepo.findCashById(cashAccountId);
    const isDeposit = dto.type === CashAdjustmentType.DEPOSIT;
    const entryDate = dto.date ? new Date(dto.date) : new Date();
    const adjustmentId = await this.dataSource.query(
      `SELECT gen_random_uuid() AS id`,
    ).then((rows: { id: string }[]) => rows[0].id);
    await this.dataSource.query(
      `INSERT INTO ledger_entries
        (id, department_id, account_id, cash_account_id, entry_type, amount,
         entry_date, source_type, source_id, description, created_by)
       VALUES ($1,
         (SELECT id FROM departments WHERE is_active = true ORDER BY created_at LIMIT 1),
         (SELECT id FROM chart_of_accounts WHERE code = 'cash'),
         $2, $3, $4, $5, 'cash_adjustment', $1, $6, $7)`,
      [
        adjustmentId,
        account.id,
        isDeposit ? 'debit' : 'credit',
        this.money(dto.amount),
        entryDate,
        dto.notes ?? (isDeposit ? 'Cash deposit' : 'Cash withdrawal'),
        actorId,
      ],
    );
    return this.getCashAccountById(account.id);
  }

  async getCashAccountById(cashAccountId: string) {
    const account = await this.accountsRepo.findCashById(cashAccountId);
    const [row] = await this.cashTotals([account.id]);
    return this.cashBalance(account, row);
  }

  deactivateBankAccount(id: string, updatedBy: string): Promise<void> {
    return this.accountsRepo.deactivateBankAccount(id, updatedBy);
  }

  private cashTotals(ids: string[]): Promise<BalanceRow[]> {
    return this.dataSource.query(
      `SELECT le.cash_account_id AS account_id,
              COALESCE(SUM(le.amount) FILTER (WHERE le.entry_type = 'debit' AND le.source_type <> 'opening_balance'), 0) AS total_in,
              COALESCE(SUM(le.amount) FILTER (WHERE le.entry_type = 'credit' AND le.source_type <> 'opening_balance'), 0) AS total_out,
              0 AS cheque_in, 0 AS cheque_out, 0 AS app_in, 0 AS app_out
         FROM ledger_entries le JOIN chart_of_accounts coa ON coa.id = le.account_id AND coa.code = 'cash'
        WHERE le.cash_account_id = ANY($1::uuid[]) GROUP BY le.cash_account_id`,
      [ids],
    );
  }

  private bankTotals(ids: string[]): Promise<BalanceRow[]> {
    return this.dataSource.query(
      `SELECT le.bank_account_id AS account_id,
              COALESCE(SUM(le.amount) FILTER (WHERE le.entry_type = 'debit' AND le.source_type <> 'opening_balance'), 0) AS total_in,
              COALESCE(SUM(le.amount) FILTER (WHERE le.entry_type = 'credit' AND le.source_type <> 'opening_balance'), 0) AS total_out,
              COALESCE(SUM(le.amount) FILTER (WHERE le.entry_type = 'debit' AND le.bank_transaction_method = 'cheque'), 0) AS cheque_in,
              COALESCE(SUM(le.amount) FILTER (WHERE le.entry_type = 'credit' AND le.bank_transaction_method = 'cheque'), 0) AS cheque_out,
              COALESCE(SUM(le.amount) FILTER (WHERE le.entry_type = 'debit' AND le.bank_transaction_method = 'app'), 0) AS app_in,
              COALESCE(SUM(le.amount) FILTER (WHERE le.entry_type = 'credit' AND le.bank_transaction_method = 'app'), 0) AS app_out
         FROM ledger_entries le JOIN chart_of_accounts coa ON coa.id = le.account_id AND coa.code = 'bank'
        WHERE le.bank_account_id = ANY($1::uuid[]) GROUP BY le.bank_account_id`,
      [ids],
    );
  }

  private cashBalance(account: CashAccount, row?: BalanceRow) {
    const totalIn = Number(row?.total_in ?? 0);
    const totalOut = Number(row?.total_out ?? 0);
    return {
      account,
      openingBalance: this.money(account.openingBalance),
      totalIn: this.money(totalIn),
      totalOut: this.money(totalOut),
      currentBalance: this.money(
        Number(account.openingBalance) + totalIn - totalOut,
      ),
    };
  }

  private bankBalance(account: BankAccount, row?: BalanceRow) {
    const totalIn = Number(row?.total_in ?? 0);
    const totalOut = Number(row?.total_out ?? 0);
    return {
      account,
      openingBalance: this.money(account.openingBalance),
      totalIn: this.money(totalIn),
      totalOut: this.money(totalOut),
      currentBalance: this.money(
        Number(account.openingBalance) + totalIn - totalOut,
      ),
      chequeIn: this.money(row?.cheque_in ?? 0),
      chequeOut: this.money(row?.cheque_out ?? 0),
      appIn: this.money(row?.app_in ?? 0),
      appOut: this.money(row?.app_out ?? 0),
    };
  }

  private async priorBalance(
    column: 'cash_account_id' | 'bank_account_id',
    id: string,
    from: Date,
  ): Promise<number> {
    const [row] = await this.dataSource.query(
      `SELECT COALESCE(SUM(CASE WHEN entry_type = 'debit' THEN amount ELSE -amount END), 0) AS balance
         FROM ledger_entries WHERE ${column} = $1 AND entry_date < $2 AND source_type <> 'opening_balance'`,
      [id, from],
    );
    return Number(row.balance);
  }

  private statement(
    account: BankAccount | CashAccount,
    rows: Record<string, unknown>[],
    opening: number,
  ) {
    let running = opening;
    const transactions = rows.map((row) => {
      const amount = Number(row.amount);
      running += row.entry_type === 'debit' ? amount : -amount;
      return {
        ...row,
        amount: this.money(amount),
        direction: row.entry_type === 'debit' ? 'IN' : 'OUT',
        runningBalance: this.money(running),
      };
    });
    return {
      account,
      transactions,
      openingBalance: this.money(opening),
      closingBalance: this.money(running),
    };
  }

  private validateRange(from: Date, to: Date): void {
    if (Number.isNaN(from.valueOf()) || Number.isNaN(to.valueOf()) || from > to)
      throw new BadRequestException('A valid date range is required');
  }

  private money(value: string | number): string {
    return Number(value).toFixed(2);
  }
}
