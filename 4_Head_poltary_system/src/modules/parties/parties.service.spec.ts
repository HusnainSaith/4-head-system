import { BadRequestException } from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import { LedgerService } from '../ledger/ledger.service';
import {
  PartyPaymentDirection,
  PartyPaymentMethod,
} from './dto/record-party-payment.dto';
import { PartiesRepository } from './parties.repository';
import { PartiesService } from './parties.service';
import { PartyTypeEnum } from '../../common/types/party-type.enum';

describe('PartiesService department payment validation', () => {
  const repository = {
    findById: jest.fn(),
  } as unknown as jest.Mocked<PartiesRepository>;
  const ledger = {
    getPartyDepartmentBalance: jest.fn(),
    post: jest.fn(),
    reverseSource: jest.fn(),
  } as unknown as jest.Mocked<LedgerService>;
  const dataSource = {
    transaction: jest.fn(),
    getRepository: jest.fn(),
  } as unknown as jest.Mocked<DataSource>;
  const service = new PartiesService(repository, ledger, dataSource);
  const payment = {
    departmentId: 'department-1',
    amount: 100,
    direction: PartyPaymentDirection.RECEIVED,
    paymentDate: '2026-07-13',
    paymentMethod: PartyPaymentMethod.CASH,
    cashAccountId: '00000000-0000-4000-8000-000000000020',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    repository.findById.mockResolvedValue({
      id: 'party-1',
      name: 'Test Party',
      primaryDepartmentId: null,
      linkedDepartmentId: null,
    } as never);
  });

  it('records money paid to a negative party as an additional advance', async () => {
    ledger.getPartyDepartmentBalance.mockResolvedValue('-300.00');
    const paymentRepository = {
      create: jest.fn((value) => value),
      save: jest.fn(async (value) => ({ id: 'payment-1', ...value })),
    };
    (dataSource.transaction as unknown as jest.Mock).mockImplementation(
      async (callback: (manager: EntityManager) => Promise<unknown>) =>
        callback({
          getRepository: () => paymentRepository,
        } as unknown as EntityManager),
    );

    await expect(
      service.recordPayment('party-1', {
        ...payment,
        direction: PartyPaymentDirection.PAID,
      }),
    ).resolves.toMatchObject({ success: true });
    expect(ledger.post).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          accountCode: 'accounts_receivable',
          partyId: 'party-1',
          entryType: 'debit',
        }),
        expect.objectContaining({
          accountCode: 'cash',
          entryType: 'credit',
        }),
      ]),
      expect.anything(),
    );
  });

  it('increases a positive payable balance when money is received', async () => {
    ledger.getPartyDepartmentBalance.mockResolvedValue('9026.00');
    const paymentRepository = {
      create: jest.fn((value) => value),
      save: jest.fn(async (value) => ({ id: 'payment-1', ...value })),
    };
    (dataSource.transaction as unknown as jest.Mock).mockImplementation(
      async (callback: (manager: EntityManager) => Promise<unknown>) =>
        callback({
          getRepository: () => paymentRepository,
        } as unknown as EntityManager),
    );

    await expect(
      service.recordPayment('party-1', {
        ...payment,
        amount: 40000,
      }),
    ).resolves.toMatchObject({ success: true });

    expect(ledger.post).toHaveBeenCalledWith(
      [
        expect.objectContaining({
          accountCode: 'cash',
          entryType: 'debit',
          amount: '40000.00',
        }),
        expect.objectContaining({
          accountCode: 'accounts_payable',
          partyId: 'party-1',
          entryType: 'credit',
          amount: '40000.00',
        }),
      ],
      expect.anything(),
    );
  });

  it('records a zero-balance payment as an advance', async () => {
    ledger.getPartyDepartmentBalance.mockResolvedValue('0.00');
    const paymentRepository = {
      create: jest.fn((value) => value),
      save: jest.fn(async (value) => ({ id: 'payment-1', ...value })),
    };
    (dataSource.transaction as unknown as jest.Mock).mockImplementation(
      async (callback: (manager: EntityManager) => Promise<unknown>) =>
        callback({
          getRepository: () => paymentRepository,
        } as unknown as EntityManager),
    );

    await expect(
      service.recordPayment('party-1', {
        ...payment,
        direction: PartyPaymentDirection.PAID,
      }),
    ).resolves.toMatchObject({ success: true });

    expect(ledger.post).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          accountCode: 'accounts_receivable',
          entryType: 'debit',
          amount: '100.00',
        }),
      ]),
      expect.anything(),
    );
  });

  it('rejects payment amounts above the selected department balance', async () => {
    ledger.getPartyDepartmentBalance.mockResolvedValue('-99.99');

    await expect(service.recordPayment('party-1', payment)).rejects.toThrow(
      new BadRequestException(
        'Payment amount cannot exceed the outstanding party balance',
      ),
    );
    expect(dataSource.transaction).not.toHaveBeenCalled();
  });

  it('settles an investor opening payable through the normal party workflow', async () => {
    repository.findById.mockResolvedValue({
      id: 'investor-1',
      name: 'Investor',
      partyType: PartyTypeEnum.INVESTOR,
      primaryDepartmentId: 'department-1',
    } as never);
    ledger.getPartyDepartmentBalance.mockResolvedValue('300.00');
    const paymentRepository = {
      create: jest.fn((value) => value),
      save: jest.fn(async (value) => ({ id: 'payment-1', ...value })),
    };
    (dataSource.transaction as unknown as jest.Mock).mockImplementation(
      async (callback: (manager: EntityManager) => Promise<unknown>) =>
        callback({
          getRepository: () => paymentRepository,
        } as unknown as EntityManager),
    );

    await expect(
      service.recordPayment(
        'investor-1',
        { ...payment, direction: PartyPaymentDirection.PAID },
        'admin-1',
      ),
    ).resolves.toMatchObject({ success: true });
    expect(ledger.post).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          partyId: 'investor-1',
          accountCode: 'accounts_payable',
          entryType: 'debit',
        }),
      ]),
      expect.anything(),
    );
  });

  it("accepts transactions in either of a party's linked departments", async () => {
    repository.findById.mockResolvedValue({
      id: 'party-1',
      name: 'Shared Shop Owner',
      primaryDepartmentId: 'supply-department',
      linkedDepartmentId: null,
      departments: [
        { id: 'supply-department', name: 'Supply' },
        { id: 'wastage-department', name: 'Wastage' },
      ],
    } as never);
    ledger.getPartyDepartmentBalance.mockResolvedValue('-300.00');
    const paymentRepository = {
      create: jest.fn((value) => value),
      save: jest.fn(async (value) => ({ id: 'payment-1', ...value })),
    };
    (dataSource.transaction as unknown as jest.Mock).mockImplementation(
      async (callback: (manager: EntityManager) => Promise<unknown>) =>
        callback({
          getRepository: () => paymentRepository,
        } as unknown as EntityManager),
    );

    await expect(
      service.recordPayment('party-1', {
        ...payment,
        departmentId: 'wastage-department',
      }),
    ).resolves.toMatchObject({ success: true });
    expect(ledger.getPartyDepartmentBalance).toHaveBeenCalledWith(
      'party-1',
      'wastage-department',
    );
    expect(ledger.post).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          departmentId: 'wastage-department',
          partyId: 'party-1',
          entryType: 'credit',
        }),
      ]),
      expect.anything(),
    );
  });
});

describe('PartiesService party-to-party settlement', () => {
  const repository = {
    findById: jest.fn(),
  } as unknown as jest.Mocked<PartiesRepository>;
  const ledger = {
    getPartyDepartmentBalance: jest.fn(),
    post: jest.fn(),
    reverseSource: jest.fn(),
  } as unknown as jest.Mocked<LedgerService>;
  const dataSource = {
    transaction: jest.fn(),
    getRepository: jest.fn(),
  } as unknown as jest.Mocked<DataSource>;
  const service = new PartiesService(repository, ledger, dataSource);
  const dto = {
    payablePartyId: 'payable-party',
    receivablePartyId: 'receivable-party',
    departmentId: 'department-1',
    settlementAmount: 250,
    settlementDate: '2026-07-01',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    repository.findById
      .mockResolvedValueOnce({ id: dto.payablePartyId, name: 'Farm' } as never)
      .mockResolvedValueOnce({ id: dto.receivablePartyId, name: 'Buyer' } as never);
    ledger.getPartyDepartmentBalance
      .mockResolvedValueOnce('500.00')
      .mockResolvedValueOnce('-300.00');
  });

  it('reduces a positive payable and a negative receivable without cash or bank entries', async () => {
    const settlementRepository = {
      create: jest.fn((value) => value),
      save: jest.fn(async (value) => ({ id: 'settlement-1', ...value })),
      findOneOrFail: jest.fn(async () => ({ id: 'settlement-1' })),
    };
    (dataSource.transaction as unknown as jest.Mock).mockImplementation(
      async (callback: (manager: EntityManager) => Promise<unknown>) =>
        callback({
          getRepository: () => settlementRepository,
        } as unknown as EntityManager),
    );

    await expect(
      service.createPartySettlement(dto, 'admin-1'),
    ).resolves.toMatchObject({ success: true });
    expect(ledger.post).toHaveBeenCalledWith(
      [
        expect.objectContaining({
          accountCode: 'accounts_payable',
          partyId: dto.payablePartyId,
          entryType: 'debit',
          amount: '250.00',
        }),
        expect.objectContaining({
          accountCode: 'accounts_receivable',
          partyId: dto.receivablePartyId,
          entryType: 'credit',
          amount: '250.00',
        }),
      ],
      expect.anything(),
    );
    const entries = (ledger.post as jest.Mock).mock.calls[0][0];
    expect(entries).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ accountCode: 'cash' }),
        expect.objectContaining({ accountCode: 'bank' }),
      ]),
    );
  });

  it('rejects an amount above either available balance', async () => {
    await expect(
      service.createPartySettlement(
        { ...dto, settlementAmount: 300.01 },
        'admin-1',
      ),
    ).rejects.toThrow('exceeds maximum available (300)');
    expect(dataSource.transaction).not.toHaveBeenCalled();
  });

  it('deleting an active settlement reverses its ledger before soft deletion', async () => {
    const settlement: any = {
      id: 'settlement-1',
      status: 'active',
      payablePartyId: dto.payablePartyId,
      receivablePartyId: dto.receivablePartyId,
      departmentId: dto.departmentId,
      settlementAmount: '250.00',
      payableParty: { name: 'Farm' },
      receivableParty: { name: 'Buyer' },
    };
    (dataSource.getRepository as unknown as jest.Mock).mockReturnValue({
      findOne: jest.fn().mockResolvedValue(settlement),
    });
    const manager = { save: jest.fn().mockResolvedValue(settlement) };
    (dataSource.transaction as unknown as jest.Mock).mockImplementation(
      async (callback: (value: EntityManager) => Promise<unknown>) =>
        callback(manager as unknown as EntityManager),
    );

    await expect(
      service.deletePartySettlement('settlement-1', 'Entered twice', 'admin-1'),
    ).resolves.toMatchObject({ success: true, data: null });
    expect(ledger.reverseSource).toHaveBeenCalledWith(
      'party_adjustment',
      'settlement-1',
      'admin-1',
      manager,
    );
    expect(settlement).toMatchObject({
      status: 'reversed',
      reversalReason: 'Entered twice',
      reversedBy: 'admin-1',
      updatedBy: 'admin-1',
    });
    expect(settlement.deletedAt).toBeInstanceOf(Date);
  });
});
