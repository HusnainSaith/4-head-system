import { PartiesRepository } from './parties.repository';
import { Party } from './entities/party.entity';
import { Repository } from 'typeorm';

function makeQb(overrides: Record<string, any> = {}) {
  const qb: any = {
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    addOrderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
    ...overrides,
  };
  return qb;
}

describe('PartiesRepository.findAll', () => {
  let repo: PartiesRepository;
  let partyRepo: jest.Mocked<Repository<Party>>;

  beforeEach(() => {
    partyRepo = { createQueryBuilder: jest.fn() } as any;
    repo = new PartiesRepository(partyRepo);
  });

  it('returns all 138 supply parties with correct total', async () => {
    const parties = Array.from({ length: 138 }, (_, i) => ({ id: `p-${i}` }));
    const qb = makeQb({ getManyAndCount: jest.fn().mockResolvedValue([parties, 138]) });
    partyRepo.createQueryBuilder.mockReturnValue(qb);

    const result = await repo.findAll({ departmentId: 'supply-dept-id', limit: 200 });

    expect(result.pagination.total).toBe(138);
    expect(result.items).toHaveLength(138);
  });

  it('uses an EXISTS subquery for department filtering — not a join alias condition', async () => {
    const qb = makeQb({ getManyAndCount: jest.fn().mockResolvedValue([[], 0]) });
    partyRepo.createQueryBuilder.mockReturnValue(qb);

    await repo.findAll({ departmentId: 'dept-1' });

    const whereCall = qb.andWhere.mock.calls.find(
      ([sql]: [string]) => typeof sql === 'string' && sql.includes('EXISTS'),
    );
    expect(whereCall).toBeDefined();
    expect(whereCall[0]).toContain('party_departments');
    expect(whereCall[0]).not.toContain('departments.id');
  });

  it('returns total=0 when no parties match', async () => {
    const qb = makeQb({ getManyAndCount: jest.fn().mockResolvedValue([[], 0]) });
    partyRepo.createQueryBuilder.mockReturnValue(qb);

    const result = await repo.findAll({ departmentId: 'dept-x' });

    expect(result.pagination.total).toBe(0);
    expect(result.items).toHaveLength(0);
  });

  it('computes pagination correctly', async () => {
    const items = Array.from({ length: 20 }, (_, i) => ({ id: `p-${i}` }));
    const qb = makeQb({ getManyAndCount: jest.fn().mockResolvedValue([items, 138]) });
    partyRepo.createQueryBuilder.mockReturnValue(qb);

    const result = await repo.findAll({ departmentId: 'supply-dept-id', page: 1, limit: 20 });

    expect(result.pagination.total).toBe(138);
    expect(result.pagination.totalPages).toBe(7);
    expect(result.pagination.hasNextPage).toBe(true);
  });
});

describe('supply seed — Supply-only department linking', () => {
  it('SUPPLY_PARTY_SEED_ENTRIES has exactly 138 entries', async () => {
    const { SUPPLY_PARTY_SEED_ENTRIES } = await import('../../database/seeds/supply-wastage-customers.seed');
    expect(SUPPLY_PARTY_SEED_ENTRIES).toHaveLength(138);
  });

  it('seedSupplyWastageCustomers links parties to Supply only — not Wastage', async () => {
    const { seedSupplyWastageCustomers } = await import('../../database/seeds/supply-wastage-customers.seed');

    const supplyDept = { id: 'supply-id', name: 'Supply' };
    const savedParties: any[] = [];

    const partyRepo = {
      findOne: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockImplementation((v) => v),
      save: jest.fn().mockImplementation((v) => {
        const saved = { ...v, id: 'party-id' };
        savedParties.push(saved);
        return Promise.resolve(saved);
      }),
    };

    const userRepo = {
      findOneBy: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockImplementation((v) => v),
      save: jest.fn().mockResolvedValue({ id: 'user-id', fullName: 'Test', email: 'test@supply.local' }),
    };

    const departmentRepo = {
      findOneBy: jest.fn().mockImplementation(({ name }: { name: string }) => {
        if (name === 'Supply') return Promise.resolve(supplyDept);
        return Promise.resolve(null);
      }),
    };

    const roleRepo = {
      findOneBy: jest.fn().mockResolvedValue({ id: 'role-id', name: 'PARTY' }),
    };

    const dataSource: any = {
      getRepository: jest.fn().mockImplementation((entity: any) => {
        const name = typeof entity === 'function' ? entity.name : '';
        if (name === 'User') return userRepo;
        if (name === 'Party') return partyRepo;
        if (name === 'Department') return departmentRepo;
        if (name === 'Role') return roleRepo;
        return { delete: jest.fn().mockResolvedValue(undefined), save: jest.fn().mockResolvedValue(undefined), create: jest.fn().mockImplementation((v) => v) };
      }),
      query: jest.fn().mockResolvedValue([{ id: 'acct-id' }]),
    };

    await seedSupplyWastageCustomers(dataSource);

    // Every saved party must have departments = [supplyDept] only
    for (const party of savedParties) {
      expect(party.departments).toEqual([supplyDept]);
      expect(party.departments).toHaveLength(1);
    }
  });
});
