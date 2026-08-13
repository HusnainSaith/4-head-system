import {
  BadRequestException,
  Controller,
  ForbiddenException,
  Get,
  Param,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { DepartmentsService } from './departments.service';
import { LedgerService } from '../ledger/ledger.service';
import { Department } from './entities/department.entity';

const departmentRouteTypes: Record<string, Department['type']> = {
  brokerage: 'BROKERAGE',
  supply: 'SUPPLY',
  wastage: 'WASTAGE',
  fresh_chicken_shop: 'FRESH_CHICKEN_SHOP',
};

export function parseDepartmentRouteType(value: string): Department['type'] {
  const routeType = value.trim().toLowerCase().replace(/-/g, '_');
  const departmentType = departmentRouteTypes[routeType];
  if (!departmentType) {
    throw new BadRequestException(`Unsupported department type: ${value}`);
  }
  return departmentType;
}

@Controller('departments')
@UseGuards(JwtAuthGuard)
export class DepartmentsController {
  constructor(
    private readonly departmentsService: DepartmentsService,
    private readonly ledgerService: LedgerService,
  ) {}
  @Get() findAll() {
    return this.departmentsService.findAll();
  }

  @Get(':type/party-balances')
  async getPartyBalances(@Param('type') type: string, @Req() request: Request) {
    const department = await this.departmentsService.findByType(
      parseDepartmentRouteType(type),
    );
    const user = (request as any).user;
    const roleName = String(
      typeof user.role === 'string' ? user.role : (user.role?.name ?? ''),
    ).toLowerCase();
    const isManagement = roleName === 'owner' || roleName === 'accountant';
    if (!isManagement && user.departmentId !== department.id) {
      throw new ForbiddenException(
        'Department staff can only view their own department balances',
      );
    }
    return this.ledgerService.getDepartmentPartyBalances(department.id);
  }
}
