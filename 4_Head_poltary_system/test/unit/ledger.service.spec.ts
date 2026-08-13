import { Test, TestingModule } from '@nestjs/testing';
import { LedgerService } from '../../src/modules/ledger/ledger.service';
import { LedgerRepository } from '../../src/modules/ledger/ledger.repository';

describe('LedgerService', () => {
  let service: LedgerService;
  let ledgerRepo: jest.Mocked<LedgerRepository>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LedgerService,
        {
          provide: LedgerRepository,
          useValue: {
            findAccountByCode: jest.fn(),
            saveEntries: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<LedgerService>(LedgerService);
    ledgerRepo = module.get(LedgerRepository);
  });

  describe('post', () => {
    it('should post debit and credit entries with resolved account IDs', async () => {
      ledgerRepo.findAccountByCode
        .mockResolvedValueOnce({ id: 'acct-1', code: 'payroll_expense' } as any)
        .mockResolvedValueOnce({ id: 'acct-2', code: 'cash' } as any);
      ledgerRepo.saveEntries.mockResolvedValue(undefined as any);

      const entries = [
        {
          departmentId: 'dept-1',
          accountCode: 'payroll_expense',
          entryType: 'debit' as const,
          amount: '1000.00',
          entryDate: new Date('2025-01-01'),
          sourceType: 'salary',
          sourceId: 'salary-1',
          description: 'Salary payment',
          createdBy: 'creator',
        },
        {
          departmentId: 'dept-1',
          accountCode: 'cash',
          entryType: 'credit' as const,
          amount: '1000.00',
          entryDate: new Date('2025-01-01'),
          sourceType: 'salary',
          sourceId: 'salary-1',
          description: 'Salary payment',
          createdBy: 'creator',
        },
      ];

      await service.post(entries, {} as any);

      expect(ledgerRepo.saveEntries).toHaveBeenCalledWith(
        [
          expect.objectContaining({
            departmentId: 'dept-1',
            accountId: 'acct-1',
            entryType: 'debit',
            amount: '1000.00',
            entryDate: '2025-01-01',
          }),
          expect.objectContaining({
            departmentId: 'dept-1',
            accountId: 'acct-2',
            entryType: 'credit',
            amount: '1000.00',
            entryDate: '2025-01-01',
          }),
        ],
        expect.anything(),
      );
    });
  });
});
