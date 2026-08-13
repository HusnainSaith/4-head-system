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
import { PartyStatementQueryDto } from './dto/party-statement-query.dto';
import { ListPartiesQueryDto } from './dto/list-parties-query.dto';
import { RecordPartyPaymentDto } from './dto/record-party-payment.dto';
import { DepartmentScopeGuard } from '../../common/guards/department-scope.guard';

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
}
