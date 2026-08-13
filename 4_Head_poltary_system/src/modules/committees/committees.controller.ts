import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { DepartmentScopeGuard } from '../../common/guards/department-scope.guard';
import { CommitteesService } from './committees.service';
import {
  CreateCommitteeDto,
  CreateInstallmentDto,
  CreatePayoutDto,
  UpdateCommitteeDto,
} from './dto/committee.dto';

@Controller('committees')
@UseGuards(JwtAuthGuard, DepartmentScopeGuard)
export class CommitteesController {
  constructor(private readonly service: CommitteesService) {}
  @Get() list(@Query('departmentId') departmentId?: string) {
    return this.service.list(departmentId);
  }
  @Post() create(@Body() dto: CreateCommitteeDto, @Req() req: any) {
    return this.service.create(dto, req.user.id);
  }
  @Get(':id') get(@Param('id') id: string) {
    return this.service.findOne(id);
  }
  @Patch(':id') update(
    @Param('id') id: string,
    @Body() dto: UpdateCommitteeDto,
    @Req() req: any,
  ) {
    return this.service.update(id, dto, req.user.id);
  }
  @Get(':id/installments') installments(@Param('id') id: string) {
    return this.service.installments(id);
  }
  @Post(':id/installments') record(
    @Param('id') id: string,
    @Body() dto: CreateInstallmentDto,
    @Req() req: any,
  ) {
    return this.service.recordInstallment(id, dto, req.user.id);
  }
  @Post(':id/payout') payout(
    @Param('id') id: string,
    @Body() dto: CreatePayoutDto,
    @Req() req: any,
  ) {
    return this.service.recordPayout(id, dto, req.user.id);
  }
}

@Controller('reports')
@UseGuards(JwtAuthGuard, DepartmentScopeGuard)
export class CommitteeReportsController {
  constructor(private readonly service: CommitteesService) {}
  @Get('committees') report(@Query('departmentId') departmentId?: string) {
    return this.service.positionReport(departmentId);
  }
}
