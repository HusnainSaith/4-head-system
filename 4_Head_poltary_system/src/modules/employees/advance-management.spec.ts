import { DataSource } from 'typeorm';
import { EmployeesService } from './employees.service';
import { EmployeesRepository } from './employees.repository';
import { LedgerService } from '../ledger/ledger.service';

describe('advance management', () => {
  let advance: any;
  const manager = {
    findOne: jest.fn(),
    query: jest.fn(),
    save: jest.fn(),
    softRemove: jest.fn(),
  };
  const ledger = { post: jest.fn() };
  const service = new EmployeesService(
    {} as EmployeesRepository,
    { transaction: (fn: any) => fn(manager) } as unknown as DataSource,
    ledger as unknown as LedgerService,
  );
  beforeEach(() => {
    jest.resetAllMocks();
    advance = {
      id: 'a',
      employeeId: 'e',
      amount: '10.00',
      amountRecovered: '0.00',
      recoveryStatus: 'outstanding',
      disbursementStatus: 'confirmed',
      paymentMethod: 'cash',
      cashAccountId: 'c',
    };
    manager.findOne.mockImplementation(async (entity) =>
      entity.name === 'EmployeeAdvance'
        ? advance
        : { departmentId: 'd', fullName: 'Employee' },
    );
    manager.query.mockImplementation(async (sql) =>
      sql.includes('FOR UPDATE')
        ? [{ opening_balance: '0.00' }]
        : [{ balance: '0.00' }],
    );
    manager.save.mockImplementation(async (_, value) => value);
  });
  it('rejects confirmation with no cash before saving or posting', async () => {
    advance.disbursementStatus = 'pending';
    await expect(
      service.confirmAdvance('e', 'a', 'cash', 'u', { cashAccountId: 'c' }),
    ).rejects.toThrow('Insufficient cash');
    expect(manager.save).not.toHaveBeenCalled();
    expect(ledger.post).not.toHaveBeenCalled();
    expect(advance.disbursementStatus).toBe('pending');
  });
  it('accepts exactly the available cash and locks the account', async () => {
    advance.disbursementStatus = 'pending';
    manager.query
      .mockResolvedValueOnce([{ opening_balance: '10.00' }])
      .mockResolvedValueOnce([{ balance: '0.00' }]);
    await service.confirmAdvance('e', 'a', 'cash', 'u', { cashAccountId: 'c' });
    expect(manager.query.mock.calls[0][0]).toContain('FOR UPDATE');
    expect(ledger.post).toHaveBeenCalled();
  });
  it('rejects a confirmed amount increase without funds', async () => {
    await expect(
      service.changeAdvance(
        'e',
        'a',
        { amount: 11, advanceDate: '2026-10-01' },
        'u',
      ),
    ).rejects.toThrow('Insufficient cash');
    expect(ledger.post).not.toHaveBeenCalled();
    expect(manager.save).not.toHaveBeenCalled();
  });
  it('returns the difference when reducing a confirmed advance', async () => {
    await service.changeAdvance(
      'e',
      'a',
      { amount: 4, advanceDate: '2026-10-01', reason: 'Correction' },
      'u',
    );
    expect(ledger.post.mock.calls[0][0]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          accountCode: 'cash',
          entryType: 'debit',
          amount: '6.00',
          cashAccountId: 'c',
        }),
      ]),
    );
    expect(advance.amount).toBe('4.00');
  });
  it('reverses confirmed payment before removing the advance', async () => {
    await service.changeAdvance('e', 'a', null, 'u');
    expect(ledger.post.mock.calls[0][0]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          accountCode: 'cash',
          entryType: 'debit',
          amount: '10.00',
        }),
      ]),
    );
    expect(manager.softRemove).toHaveBeenCalled();
  });
  it('deletes pending advances without changing funds', async () => {
    advance.disbursementStatus = 'pending';
    await service.changeAdvance('e', 'a', null, 'u');
    expect(ledger.post).not.toHaveBeenCalled();
    expect(manager.softRemove).toHaveBeenCalled();
  });
  it('protects advances already recovered through payroll', async () => {
    advance.amountRecovered = '1.00';
    await expect(service.changeAdvance('e', 'a', null, 'u')).rejects.toThrow(
      'recovered through payroll',
    );
    expect(manager.softRemove).not.toHaveBeenCalled();
  });
  it('rejects another employees advance', async () => {
    manager.findOne.mockResolvedValue(null);
    await expect(service.changeAdvance('e', 'a', null, 'u')).rejects.toThrow(
      'not found',
    );
  });
});
