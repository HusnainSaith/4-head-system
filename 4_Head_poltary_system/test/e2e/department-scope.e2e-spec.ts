import {
  Controller,
  Get,
  Module,
  Param,
  Post,
  Body,
  UseGuards,
  MiddlewareConsumer,
  NestModule,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import request = require('supertest');
import { DepartmentScopeGuard } from '../../src/common/guards/department-scope.guard';

const brokerageId = '11111111-1111-4111-8111-111111111111';
const supplyId = '22222222-2222-4222-8222-222222222222';
const recordId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const dataSource = { query: jest.fn() };

@Controller()
@UseGuards(DepartmentScopeGuard)
class ScopeProbeController {
  @Get('expenses/:id') expense(@Param('id') id: string) {
    return { id };
  }
  @Get('api/v1/vehicles/:id') vehicle(@Param('id') id: string) {
    return { id };
  }
  @Get('parties/:id') party(@Param('id') id: string) {
    return { id };
  }
  @Get('employees/:id') employee(@Param('id') id: string) {
    return { id };
  }
  @Post('expenses') createExpense(@Body() body: any) {
    return body;
  }
}

@Module({
  controllers: [ScopeProbeController],
  providers: [
    DepartmentScopeGuard,
    { provide: DataSource, useValue: dataSource },
  ],
})
class ScopeProbeModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply((req: any, _res: any, next: () => void) => {
        req.user = {
          id: 'staff-1',
          role: { name: 'department_staff' },
          departmentId: brokerageId,
          departmentType: 'BROKERAGE',
        };
        next();
      })
      .forRoutes('*');
  }
}

describe('department scope enforcement (e2e)', () => {
  let app: any;
  beforeAll(async () => {
    dataSource.query.mockResolvedValue([{ department_id: supplyId }]);
    const moduleRef = await Test.createTestingModule({
      imports: [ScopeProbeModule],
    }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => app.close());

  it.each([
    `/expenses/${recordId}`,
    `/api/v1/vehicles/${recordId}`,
    `/parties/${recordId}`,
    `/employees/${recordId}`,
  ])('forbids Brokerage staff from direct Supply record %s', async (url) => {
    await request(app.getHttpServer()).get(url).expect(403);
  });

  it('rejects a spoofed departmentId in a write body', async () => {
    await request(app.getHttpServer())
      .post('/expenses')
      .send({ departmentId: supplyId, amount: '100.00' })
      .expect(403);
  });
});
