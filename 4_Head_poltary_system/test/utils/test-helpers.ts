import { Repository } from 'typeorm';

export const mockRepository = () => ({
  find: jest.fn(),
  findOne: jest.fn(),
  findOneBy: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  remove: jest.fn(),
  createQueryBuilder: jest.fn(() => ({
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    getMany: jest.fn(),
    getOne: jest.fn(),
  })),
});

export const mockJwtService = () => ({
  signAsync: jest.fn(),
  verifyAsync: jest.fn(),
});

import { RoleEnum } from '../../src/modules/roles/role.enum';

export const createMockUser = () => ({
  id: 'test-user-id',
  email: 'test@example.com',
  fullName: 'Test User',
  password: 'hashedPassword',
  role: {
    id: 'role-id',
    name: RoleEnum.EMPLOYEE,
    description: 'User role',
    createdAt: new Date(),
    updatedAt: new Date(),
    users: [],
  },
  createdAt: new Date(),
  updatedAt: new Date(),
  createdClientPlanQuotations: [],
});
