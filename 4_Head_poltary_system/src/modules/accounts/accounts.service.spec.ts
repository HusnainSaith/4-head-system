import { DataSource } from 'typeorm';
import { AccountsRepository } from './accounts.repository';
import { AccountsService } from './accounts.service';
import { paymentAccountLink } from './dto/payment-account-selection.dto';

describe('AccountsService', () => {
  const repository = {
    findCashByDepartment: jest.fn(),
    findAllCashAccounts: jest.fn(),
    findBankById: jest.fn(),
    findAllBankAccounts: jest.fn(),
  } as unknown as jest.Mocked<AccountsRepository>;
  const dataSource = { query: jest.fn() } as unknown as jest.Mocked<DataSource>;
  const service = new AccountsService(repository, dataSource);

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
