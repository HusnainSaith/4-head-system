import { Controller, INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request = require('supertest');
import { CommitteesController } from '../../src/modules/committees/committees.controller';
import { CommitteesService } from '../../src/modules/committees/committees.service';
import { JwtAuthGuard } from '../../src/modules/auth/guards/jwt-auth.guard';
import { DepartmentScopeGuard } from '../../src/common/guards/department-scope.guard';

describe('committee lifecycle API (e2e)', () => {
  let app: INestApplication;
  const installments: any[] = [];
  const service = {
    create: jest.fn(async (dto) => ({ id: 'c1', status: 'active', ...dto })),
    findOne: jest.fn(async (id) => ({ id, status: 'active' })),
    update: jest.fn(),
    list: jest.fn(),
    positionReport: jest.fn(),
    installments: jest.fn(async () => installments),
    recordInstallment: jest.fn(async (_id, dto) => {
      const row = { id: `i${installments.length + 1}`, ...dto };
      installments.push(row);
      return row;
    }),
    recordPayout: jest.fn(async (_id, dto) => ({
      id: 'p1',
      ...dto,
      totalContributed: installments
        .reduce((sum, row) => sum + row.amount, 0)
        .toFixed(2),
    })),
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [CommitteesController],
      providers: [{ provide: CommitteesService, useValue: service }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate: (context: any) => {
          context.switchToHttp().getRequest().user = {
            id: 'owner-1',
            role: { name: 'owner' },
          };
          return true;
        },
      })
      .overrideGuard(DepartmentScopeGuard)
      .useValue({ canActivate: () => true })
      .compile();
    app = moduleRef.createNestApplication();
    await app.init();
  });
  afterAll(async () => app.close());

  it('creates a committee, records three installments, and records payout', async () => {
    await request(app.getHttpServer())
      .post('/committees')
      .send({
        departmentId: '11111111-1111-4111-8111-111111111111',
        name: 'Test Kameti',
        installmentAmount: 100,
        totalMembers: 3,
        payoutPosition: 3,
        startDate: '2026-08-01',
      })
      .expect(201);
    for (let index = 0; index < 3; index++)
      await request(app.getHttpServer())
        .post('/committees/c1/installments')
        .send({
          amount: 100,
          installmentDate: `2026-${String(8 + index).padStart(2, '0')}-01`,
          paymentMethod: 'cash',
        })
        .expect(201);
    const payout = await request(app.getHttpServer())
      .post('/committees/c1/payout')
      .send({
        payoutAmount: 300,
        totalContributed: 300,
        payoutDate: '2026-10-01',
        paymentMethod: 'bank',
      })
      .expect(201);
    expect(payout.body.totalContributed).toBe('300.00');
    expect(service.recordInstallment).toHaveBeenCalledTimes(3);
    expect(service.recordPayout).toHaveBeenCalledTimes(1);
  });
});
