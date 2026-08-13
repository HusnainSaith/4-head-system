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
  } as unknown as jest.Mocked<LedgerService>;
  const dataSource = {
    transaction: jest.fn(),
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

  it('only accepts received money for a receivable balance', async () => {
    ledger.getPartyDepartmentBalance.mockResolvedValue('300.00');

    await expect(
      service.recordPayment('party-1', {
        ...payment,
        direction: PartyPaymentDirection.PAID,
      }),
    ).rejects.toThrow(
      new BadRequestException('This balance must be recorded as received'),
    );
    expect(dataSource.transaction).not.toHaveBeenCalled();
  });

  it('only accepts paid money for a payable balance', async () => {
    ledger.getPartyDepartmentBalance.mockResolvedValue('-300.00');

    await expect(service.recordPayment('party-1', payment)).rejects.toThrow(
      new BadRequestException('This balance must be recorded as paid'),
    );
    expect(dataSource.transaction).not.toHaveBeenCalled();
  });

  it('rejects payment amounts above the selected department balance', async () => {
    ledger.getPartyDepartmentBalance.mockResolvedValue('99.99');

    await expect(service.recordPayment('party-1', payment)).rejects.toThrow(
      new BadRequestException(
        'Payment amount cannot exceed the outstanding party balance',
      ),
    );
    expect(dataSource.transaction).not.toHaveBeenCalled();
  });

  it('requires investor balances to use the protected assignment workflow', async () => {
    repository.findById.mockResolvedValue({
      id: 'investor-1',
      name: 'Investor',
      partyType: PartyTypeEnum.INVESTOR,
      primaryDepartmentId: 'department-1',
    } as never);

    await expect(service.recordPayment('investor-1', payment)).rejects.toThrow(
      'Investor balances must be paid through the investment assignment workflow',
    );
    expect(ledger.getPartyDepartmentBalance).not.toHaveBeenCalled();
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
        expect.objectContaining({ departmentId: 'wastage-department' }),
      ]),
      expect.anything(),
    );
  });
});
