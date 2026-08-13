import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateUserDto } from './dto/create-user.dto';
import { UsersService } from './users.service';

describe('UsersService regressions', () => {
  it('applies search, role, and department filters to the user query', async () => {
    const query = {
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([]),
    };
    const service = new UsersService({
      userRepository: { createQueryBuilder: jest.fn().mockReturnValue(query) },
    } as any);

    await service.findAll({
      search: ' tayyab ',
      roleId: '00000000-0000-4000-8000-000000000001',
      departmentId: '00000000-0000-4000-8000-000000000002',
    });

    expect(query.andWhere).toHaveBeenCalledWith(
      '(user.full_name ILIKE :search OR user.email ILIKE :search)',
      { search: '%tayyab%' },
    );
    expect(query.andWhere).toHaveBeenCalledWith('user.role_id = :roleId', {
      roleId: '00000000-0000-4000-8000-000000000001',
    });
    expect(query.andWhere).toHaveBeenCalledWith(
      'user.department_id = :departmentId',
      { departmentId: '00000000-0000-4000-8000-000000000002' },
    );
  });

  it('loads role and direct permissions without selecting nonexistent audit columns', async () => {
    const query = {
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      getOne: jest.fn().mockResolvedValue({
        id: '00000000-0000-4000-8000-000000000001',
        role: { id: '00000000-0000-4000-8000-000000000002' },
      }),
    };
    const databaseQuery = jest.fn().mockResolvedValue([]);
    const service = new UsersService({
      userRepository: {
        createQueryBuilder: jest.fn().mockReturnValue(query),
        manager: { query: databaseQuery },
      },
    } as any);

    await expect(
      service.findOneWithPermissions('00000000-0000-4000-8000-000000000001'),
    ).resolves.toMatchObject({ permissions: [] });

    expect(databaseQuery).toHaveBeenCalledTimes(2);
    for (const [sql] of databaseQuery.mock.calls) {
      expect(sql).not.toContain('p.created_at');
      expect(sql).not.toContain('p.updated_at');
    }
  });

  it('accepts numbers in a user full name', async () => {
    const dto = plainToInstance(CreateUserDto, {
      fullName: 'Seed Supply Broker1',
      email: 'broker1@example.com',
      password: 'StrongPass1',
    });

    const errors = await validate(dto);

    expect(
      errors.find(({ property }) => property === 'fullName'),
    ).toBeUndefined();
  });

  it('includes active investor users in the party-user lookup', async () => {
    const query = {
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([]),
    };
    const service = new UsersService({
      userRepository: { createQueryBuilder: jest.fn().mockReturnValue(query) },
    } as any);

    await service.findPartyUsers();

    expect(query.where).toHaveBeenCalledWith(
      'UPPER(role.name) IN (:...partyRoles)',
      expect.objectContaining({
        partyRoles: expect.arrayContaining(['INVESTOR']),
      }),
    );
  });
});
