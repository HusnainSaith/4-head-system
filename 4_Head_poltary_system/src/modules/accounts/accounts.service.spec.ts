import { DataSource } from 'typeorm';
import { AccountsRepository } from './accounts.repository';
import { AccountsService } from './accounts.service';
import { paymentAccountLink } from './dto/payment-account-selection.dto';
import { LedgerService } from '../ledger/ledger.service';

describe('AccountsService', () => {
  const repository = {
    findCashByDepartment: jest.fn(),
    findCashById: jest.fn(),
    findAllCashAccounts: jest.fn(),
    findBankById: jest.fn(),
    findAllBankAccounts: jest.fn(),
  } as unknown as jest.Mocked<AccountsRepository>;
  const dataSource = { query: jest.fn() } as unknown as jest.Mocked<DataSource>;
  const ledger = { post: jest.fn() } as unknown as jest.Mocked<LedgerService>;
  const service = new AccountsService(repository, dataSource, ledger);

  beforeEach(() => jest.clearAllMocks());

  it('derives a cash balance from opening, debit and credit totals', async () => {
    repository.findCashByDepartment.mockResolvedValue({
      id: 'cash-1',
      departmentId: 'dept-1',
      openingBalance: '100.00',
    } as never);
    dataSource.query.mockResolvedValue([
      { account_id: 'cash-1', total_in: '50.00', total_out: '20.00' },
    ]);
    await expect(
      service.getCashAccountBalance('dept-1'),
    ).resolves.toMatchObject({
      openingBalance: '100.00',
      totalIn: '50.00',
      totalOut: '20.00',
      currentBalance: '130.00',
    });
  });

  it('calculates total funds from all cash and bank balances', async () => {
    jest
      .spyOn(service, 'getAllCashBalances')
      .mockResolvedValue([{ currentBalance: '125.50' }] as never);
    jest
      .spyOn(service, 'getAllBankBalances')
      .mockResolvedValue([{ currentBalance: '74.50' }] as never);
    await expect(service.getFullCashBankSummary()).resolves.toMatchObject({
      totalCash: '125.50',
      totalBank: '74.50',
      totalFunds: '200.00',
    });
  });

  it('adds an owner deposit to a bank account with a balanced ledger posting', async () => {
    repository.findBankById.mockResolvedValue({
      id: 'bank-1',
      bankName: 'Owner Bank',
      openingBalance: '0.00',
    } as never);
    repository.findCashById.mockResolvedValue({
      id: 'cash-1',
      accountName: 'Admin Cash Drawer',
      openingBalance: '10000.00',
    } as never);
    dataSource.query
      .mockResolvedValueOnce([
        { account_id: 'cash-1', total_in: '0.00', total_out: '0.00' },
      ])
      .mockResolvedValueOnce([{ id: 'department-1' }])
      .mockResolvedValueOnce([{ id: 'adjustment-1' }])
      .mockResolvedValueOnce([
        { account_id: 'bank-1', total_in: '5000.00', total_out: '0.00' },
      ]);

    await expect(
      service.adjustBankAccount(
        'bank-1',
        {
          type: 'deposit' as never,
          amount: 5000,
          cashAccountId: 'cash-1',
          bankTransactionMethod: 'app',
          appReference: 'OWN-DEP-001',
          date: '2026-07-01',
        },
        'admin-1',
      ),
    ).resolves.toMatchObject({ currentBalance: '5000.00' });
    expect(ledger.post).toHaveBeenCalledWith([
      expect.objectContaining({
        accountCode: 'bank',
        bankAccountId: 'bank-1',
        entryType: 'debit',
        amount: '5000.00',
      }),
      expect.objectContaining({
        accountCode: 'cash',
        cashAccountId: 'cash-1',
        entryType: 'credit',
        amount: '5000.00',
      }),
    ]);
  });

  it('rejects a bank deposit above the selected cash drawer balance', async () => {
    repository.findBankById.mockResolvedValue({
      id: 'bank-1',
      bankName: 'Owner Bank',
    } as never);
    repository.findCashById.mockResolvedValue({
      id: 'cash-1',
      accountName: 'Admin Cash Drawer',
      openingBalance: '100.00',
    } as never);
    dataSource.query.mockResolvedValueOnce([
      { account_id: 'cash-1', total_in: '0.00', total_out: '0.00' },
    ]);

    await expect(
      service.adjustBankAccount(
        'bank-1',
        {
          type: 'deposit' as never,
          amount: 101,
          cashAccountId: 'cash-1',
          bankTransactionMethod: 'app',
        },
        'admin-1',
      ),
    ).rejects.toThrow('cannot exceed the selected cash drawer balance');
    expect(ledger.post).not.toHaveBeenCalled();
  });
});

describe('payment account linking', () => {
  it('requires the correct account for cash, bank and cheque payments', () => {
    expect(() => paymentAccountLink({ paymentMethod: 'cash' })).toThrow(
      'cashAccountId',
    );
    expect(() =>
      paymentAccountLink({
        paymentMethod: 'bank',
        bankAccountId: 'bank',
        bankTransactionMethod: 'cheque',
      }),
    ).toThrow('chequeNumber');
    expect(
      paymentAccountLink({
        paymentMethod: 'bank',
        bankAccountId: 'bank',
        bankTransactionMethod: 'app',
      }),
    ).toEqual({
      bankAccountId: 'bank',
      bankTransactionMethod: 'app',
      chequeNumber: undefined,
      appReference: undefined,
    });
  });

  it('does not allow account IDs on credit transactions', () => {
    expect(() =>
      paymentAccountLink({ paymentMethod: 'credit', cashAccountId: 'cash' }),
    ).toThrow('Credit transactions');
  });
});
