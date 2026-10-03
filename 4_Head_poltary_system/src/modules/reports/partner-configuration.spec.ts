import { ReportsRepository } from './reports.repository';
import { Party } from '../parties/entities/party.entity';
import { Department } from '../departments/entities/department.entity';
import { DepartmentPartnerShare } from './entities/department-partner-share.entity';

describe('department partner ownership configuration', () => {
  it('reuses a partner user account without changing its existing party type', async () => {
    const { repository, manager } = setup();
    manager.findOne.mockImplementation(async (entity) =>
      entity === Department
        ? { id: 'd1' }
        : { id: 'existing-account', partyType: 'random_user', userId: 'u1' },
    );
    await repository.savePartnerShares(
      'd1',
      { allocationMode: 'equal', shares: [{ userId: 'u1' }, { userId: 'u2' }] },
      'owner',
    );
    expect(manager.save).toHaveBeenCalledWith(
      Party,
      expect.objectContaining({
        id: 'existing-account',
        partyType: 'random_user',
      }),
    );
    expect(manager.create).not.toHaveBeenCalled();
  });
  function setup() {
    const query = {
      innerJoin: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      setLock: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([
        { id: 'u1', fullName: 'Ali' },
        { id: 'u2', fullName: 'Sara' },
      ]),
    };
    const manager = {
      findOne: jest
        .fn()
        .mockImplementation(async (entity) =>
          entity === Department ? { id: 'd1' } : null,
        ),
      getRepository: jest
        .fn()
        .mockReturnValue({ createQueryBuilder: () => query }),
      delete: jest.fn(),
      query: jest.fn(),
      create: jest.fn().mockImplementation((_entity, value) => value),
      save: jest
        .fn()
        .mockImplementation(async (entity, value) =>
          entity === Party ? { ...value, id: `party-${value.userId}` } : value,
        ),
    };
    const transaction = jest
      .fn()
      .mockImplementation((callback) => callback(manager));
    const repository = new ReportsRepository(
      ...([
        ...Array(10).fill(undefined),
        { manager: { transaction } },
      ] as unknown as ConstructorParameters<typeof ReportsRepository>),
    );
    return { repository, manager, transaction };
  }
  it('rejects totals other than 100 before changing accounts', async () => {
    const { repository, transaction } = setup();
    await expect(
      repository.savePartnerShares(
        'd1',
        { shares: [{ userId: 'u1', percentage: '90' }] },
        'owner',
      ),
    ).rejects.toThrow('100%');
    expect(transaction).not.toHaveBeenCalled();
  });
  it('saves equal ownership without requiring decimal percentages', async () => {
    const { repository, manager } = setup();
    await repository.savePartnerShares(
      'd1',
      { allocationMode: 'equal', shares: [{ userId: 'u1' }, { userId: 'u2' }] },
      'owner',
    );
    expect(manager.save).toHaveBeenCalledWith(
      DepartmentPartnerShare,
      expect.objectContaining({
        equalShare: true,
        percentage: '0.0000',
        userId: 'u1',
      }),
    );
    expect(manager.save).toHaveBeenCalledWith(
      DepartmentPartnerShare,
      expect.objectContaining({
        equalShare: true,
        percentage: '0.0000',
        userId: 'u2',
      }),
    );
  });
  it('rejects missing or cross-department partners', async () => {
    const { repository, manager } = setup();
    await expect(
      repository.savePartnerShares(
        'd1',
        { shares: [{ userId: 'other', percentage: '100' }] },
        'owner',
      ),
    ).rejects.toThrow('every current partner');
    expect(manager.save).not.toHaveBeenCalled();
  });
  it('creates linked partner accounts and saves the full percentage configuration', async () => {
    const { repository, manager } = setup();
    await repository.savePartnerShares(
      'd1',
      {
        shares: [
          { userId: 'u1', percentage: '70' },
          { userId: 'u2', percentage: '30' },
        ],
      },
      'owner',
    );
    expect(manager.save).toHaveBeenCalledWith(
      DepartmentPartnerShare,
      expect.objectContaining({
        userId: 'u1',
        percentage: '70.0000',
        partyId: 'party-u1',
        departmentId: 'd1',
        updatedBy: 'owner',
      }),
    );
    expect(manager.save).toHaveBeenCalledWith(
      DepartmentPartnerShare,
      expect.objectContaining({ userId: 'u2', percentage: '30.0000' }),
    );
  });
});
