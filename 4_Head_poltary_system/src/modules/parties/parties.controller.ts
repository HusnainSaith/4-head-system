import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
  Delete,
  Req,
  ForbiddenException,
} from '@nestjs/common';
import type { Request } from 'express';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../modules/auth/guards/jwt-auth.guard';
import { BaseController } from '../../common/controllers/base.controller';
import { PartiesService } from './parties.service';
import { CreatePartyDto } from './dto/create-party.dto';
import { UpdatePartyDto } from './dto/update-party.dto';
import { AdjustPartyBalanceDto } from './dto/adjust-party-balance.dto';
import { PartyStatementQueryDto } from './dto/party-statement-query.dto';
import { ListPartiesQueryDto } from './dto/list-parties-query.dto';
import { RecordPartyPaymentDto, UpdatePartyPaymentDto } from './dto/record-party-payment.dto';
import { CreatePartySettlementDto } from './dto/create-party-settlement.dto';
import { UpdatePartySettlementDto } from './dto/create-party-settlement.dto';
import { DepartmentScopeGuard } from '../../common/guards/department-scope.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { RoleEnum } from '../../common/enums/role.enum';

@ApiTags('Parties')
@Controller('parties')
@UseGuards(JwtAuthGuard, DepartmentScopeGuard)
export class PartiesController extends BaseController {
  constructor(private readonly partiesService: PartiesService) {
    super();
  }

  @Post()
  @ApiOperation({ summary: 'Create a new party' })
  create(@Body() dto: CreatePartyDto) {
    return this.handleAsyncOperation(this.partiesService.create(dto));
  }

  @Get()
  @ApiOperation({ summary: 'List parties with pagination and filtering' })
  findAll(@Query() query: ListPartiesQueryDto) {
    return this.handleAsyncOperation(this.partiesService.findAll(query));
  }

  @Post('settlements')
  @ApiOperation({ summary: 'Create a party-to-party settlement' })
  createSettlement(
    @Body() dto: CreatePartySettlementDto,
    @Req() req: Request,
  ) {
    const user = (req as any).user;
    return this.handleAsyncOperation(
      this.partiesService.createPartySettlement(dto, user.id),
    );
  }

  @Get('settlements/all')
  @ApiOperation({ summary: 'List party settlements across departments' })
  listSettlements(
    @Query('departmentId') departmentId: string | undefined,
    @Req() req: Request,
  ) {
    const user = (req as any).user;
    const roleName = String(
      typeof user.role === 'string' ? user.role : (user.role?.name ?? ''),
    ).toLowerCase();
    if (roleName === 'department_staff') {
      if (!user.departmentId) {
        throw new ForbiddenException('Department assignment is required');
      }
      departmentId = user.departmentId;
    }
    return this.handleAsyncOperation(
      this.partiesService.listPartySettlements(departmentId),
    );
  }

  @Patch('settlements/:id')
  @UseGuards(RolesGuard)
  @Roles(RoleEnum.OWNER, RoleEnum.ACCOUNTANT)
  @ApiOperation({ summary: 'Edit an active party settlement' })
  updateSettlement(
    @Param('id') id: string,
    @Body() dto: UpdatePartySettlementDto,
    @Req() req: Request,
  ) {
    const user = (req as any).user;
    return this.handleAsyncOperation(
      this.partiesService.updatePartySettlement(id, dto, user.id),
    );
  }

  @Delete('settlements/:id')
  @UseGuards(RolesGuard)
  @Roles(RoleEnum.OWNER, RoleEnum.ACCOUNTANT)
  @ApiOperation({ summary: 'Reverse and soft-delete an active settlement' })
  deleteSettlement(
    @Param('id') id: string,
    @Body() body: { reason?: string },
    @Req() req: Request,
  ) {
    const user = (req as any).user;
    return this.handleAsyncOperation(
      this.partiesService.deletePartySettlement(
        id,
        body.reason ?? 'Settlement deleted',
        user.id,
      ),
    );
  }

  @Post('settlements/:id/reverse')
  @UseGuards(RolesGuard)
  @Roles(RoleEnum.OWNER, RoleEnum.ACCOUNTANT)
  @ApiOperation({ summary: 'Reverse a party settlement' })
  reverseSettlement(
    @Param('id') id: string,
    @Body() body: { reversalReason: string },
    @Req() req: Request,
  ) {
    const user = (req as any).user;
    return this.handleAsyncOperation(
      this.partiesService.reversePartySettlement(id, body.reversalReason, user.id),
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single party by ID' })
  findOne(@Param('id') id: string) {
    return this.handleAsyncOperation(this.partiesService.findById(id));
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an existing party' })
  update(@Param('id') id: string, @Body() dto: UpdatePartyDto) {
    return this.handleAsyncOperation(this.partiesService.update(id, dto));
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Soft delete a party' })
  remove(@Param('id') id: string) {
    return this.handleAsyncOperation(this.partiesService.remove(id));
  }

  @Get(':id/statement')
  @ApiOperation({ summary: 'Get party ledger statement' })
  getStatement(
    @Param('id') id: string,
    @Query() query: PartyStatementQueryDto,
  ) {
    return this.handleAsyncOperation(
      this.partiesService.getStatement({ ...query, partyId: id }),
    );
  }

  @Post(':id/payments')
  @ApiOperation({ summary: 'Record a payment for a party' })
  recordPayment(
    @Param('id') id: string,
    @Body() dto: RecordPartyPaymentDto,
    @Req() req: Request,
  ) {
    const user = (req as any).user;
    const roleName = String(
      typeof user.role === 'string' ? user.role : (user.role?.name ?? ''),
    ).toLowerCase();
    if (roleName === 'department_staff') {
      if (!user.departmentId) {
        throw new ForbiddenException('Department assignment is required');
      }
      if (dto.departmentId && dto.departmentId !== user.departmentId) {
        throw new ForbiddenException(
          'Department staff can only record payments for their own department',
        );
      }
      dto.departmentId = user.departmentId;
    }
    return this.handleAsyncOperation(
      this.partiesService.recordPayment(id, dto, user.id),
    );
  }

  @Patch(':id/payments/:paymentId')
  @ApiOperation({ summary: 'Update a party payment' })
  updatePayment(
    @Param('id') id: string,
    @Param('paymentId') paymentId: string,
    @Body() dto: UpdatePartyPaymentDto,
    @Req() req: Request,
  ) {
    const user = (req as any).user;
    return this.handleAsyncOperation(
      this.partiesService.updatePayment(id, paymentId, dto, user.id),
    );
  }

  @Get(':id/settlements')
  @ApiOperation({ summary: 'Get settlement history for a party' })
  getSettlementHistory(
    @Param('id') id: string,
    @Query('departmentId') departmentId?: string,
  ) {
    return this.handleAsyncOperation(
      this.partiesService.getPartySettlementHistory(id, departmentId),
    );
  }

  @Post(':id/adjust-balance')
  @ApiOperation({ summary: 'Adjust party balance (admin only)' })
  adjustBalance(
    @Param('id') id: string,
    @Body() dto: AdjustPartyBalanceDto,
    @Req() req: Request,
  ) {
    const user = (req as any).user;
    return this.handleAsyncOperation(
      this.partiesService.adjustBalance(id, dto, user.id),
    );
  }
}
