import { PartiesService } from './parties.service';

describe('Payment in and out amendments', () => {
  let service: PartiesService, ledger: any, manager: any, payment: any;
  beforeEach(() => {
    payment = {
      id: 'payment',
      partyId: 'party',
      departmentId: 'brokerage',
      amount: '100.00',
      direction: 'paid',
      paymentMethod: 'cash',
      cashAccountId: 'admin',
      paymentDate: '2026-10-01',
    };
    const repository = {
      findOne: jest.fn().mockResolvedValue(payment),
      save: jest.fn(async (value) => value),
    };
    manager = {
      getRepository: () => repository,
      delete: jest.fn(),
      update: jest.fn(),
    };
    ledger = {
      getPartyDepartmentBalance: jest.fn().mockResolvedValue('100.00'),
      post: jest.fn(),
      getAdminCashAccountId: jest.fn().mockResolvedValue('admin'),
    };
    service = new PartiesService(
      {
        findById: jest
          .fn()
          .mockResolvedValue({ id: 'party', partyType: 'customer' }),
      } as any,
      ledger,
      { transaction: jest.fn(async (work) => work(manager)) } as any,
    );
  });
  it('rebuilds a paid amount crossing zero with balanced cash and party entries', async () => {
    await service.updatePayment('party', 'payment', { amount: 300 }, 'actor');
    expect(ledger.post).toHaveBeenCalledWith(
      [
        expect.objectContaining({
          accountCode: 'accounts_payable',
          entryType: 'debit',
          amount: '200.00',
        }),
        expect.objectContaining({
          accountCode: 'accounts_receivable',
          entryType: 'debit',
          amount: '100.00',
        }),
        expect.objectContaining({
          accountCode: 'cash',
          entryType: 'credit',
          amount: '300.00',
        }),
      ],
      manager,
    );
  });
  it('switches direction to received and clears old cash when switching to bank', async () => {
    await service.updatePayment('party', 'payment', {
      amount: 50,
      direction: 'received',
      paymentMethod: 'bank',
      bankAccountId: 'bank',
      bankTransactionMethod: 'app',
    } as any);
    expect(payment.cashAccountId).toBeNull();
    expect(ledger.post).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          accountCode: 'bank',
          entryType: 'debit',
          amount: '50.00',
          bankAccountId: 'bank',
        }),
      ]),
      manager,
    );
  });
  it('updates only the date without reposting and deletes payment sources transactionally', async () => {
    await service.updatePayment('party', 'payment', {
      paymentDate: '2026-10-11',
    });
    expect(ledger.post).not.toHaveBeenCalled();
    await service.deletePayment('party', 'payment', 'actor');
    expect(manager.delete).toHaveBeenCalledTimes(2);
  });
});
