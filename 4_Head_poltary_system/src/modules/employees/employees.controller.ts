import {
  Controller,
  Post,
  Body,
  Get,
  Query,
  Param,
  Patch,
  Delete,
  UseGuards,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { EmployeesService } from './employees.service';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { CreateAdvanceDto } from './dto/create-advance.dto';
import { CreateBonusDto } from './dto/create-bonus.dto';
import { RunPayrollDto } from './dto/run-payroll.dto';
import { MarkSalaryPaymentDto } from './dto/mark-salary-payment.dto';
import { ConfirmAdvanceDto } from './dto/confirm-advance.dto';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { RoleEnum } from '../../common/enums/role.enum';
import { CreateSalaryWithdrawalDto } from './dto/create-salary-withdrawal.dto';
import { DepartmentScopeGuard } from '../../common/guards/department-scope.guard';

@ApiTags('Employees')
@ApiBearerAuth('JWT-auth')
@Controller()
@UseGuards(JwtAuthGuard, RolesGuard, DepartmentScopeGuard)
@Roles(RoleEnum.OWNER, RoleEnum.ACCOUNTANT, RoleEnum.DEPARTMENT_STAFF)
export class EmployeesController {
  constructor(private readonly employeesService: EmployeesService) {}

  @Post('employees')
  @ApiOperation({ summary: 'Create employee record' })
  async create(@Body() dto: CreateEmployeeDto, @Req() req: Request) {
    const user = (req as any).user;
    if (user.role?.name === RoleEnum.DEPARTMENT_STAFF)
      dto.departmentId = user.departmentId;
    return this.employeesService.create(dto);
  }

  @Get('employees')
  @ApiOperation({ summary: 'List employees' })
  @ApiQuery({ name: 'departmentId', required: false })
  async findAll(
    @Query('departmentId') departmentId: string | undefined,
    @Req() req: Request,
  ) {
    const user = (req as any).user;
    if (user.role?.name === RoleEnum.DEPARTMENT_STAFF)
      departmentId = user.departmentId;
    return this.employeesService.findAll(departmentId);
  }

  @Get('employees/:id')
  @ApiOperation({ summary: 'Get employee by id' })
  async findOne(@Param('id') id: string) {
    return this.employeesService.findOne(id);
  }

  @Patch('employees/:id')
  @ApiOperation({ summary: 'Update employee record' })
  async update(@Param('id') id: string, @Body() dto: UpdateEmployeeDto) {
    return this.employeesService.update(id, dto);
  }

  @Delete('employees/:id')
  @ApiOperation({ summary: 'Delete employee record' })
  async remove(@Param('id') id: string) {
    return this.employeesService.remove(id);
  }

  @Patch('employees/:id/activate')
  @ApiOperation({ summary: 'Reactivate a deactivated employee record' })
  async activate(@Param('id') id: string) {
    return this.employeesService.activate(id);
  }

  @Get('employees/:id/advances')
  @ApiOperation({ summary: 'List employee advances' })
  async getAdvances(@Param('id') employeeId: string) {
    return this.employeesService.getAdvances(employeeId);
  }

  @Post('employees/:id/advances')
  @ApiOperation({ summary: 'Create employee advance' })
  async createAdvance(
    @Param('id') employeeId: string,
    @Body() dto: CreateAdvanceDto,
    @Req() req: Request,
  ) {
    return this.employeesService.createAdvance(
      employeeId,
      dto,
      (req as any).user.id,
    );
  }

  @Post('employees/:employeeId/advances/:advanceId/confirm')
  @Roles(RoleEnum.OWNER, RoleEnum.ACCOUNTANT)
  @ApiOperation({ summary: 'Confirm and disburse an employee advance' })
  confirmAdvance(
    @Param('employeeId') employeeId: string,
    @Param('advanceId') advanceId: string,
    @Body() dto: ConfirmAdvanceDto,
    @Req() req: Request,
  ) {
    return this.employeesService.confirmAdvance(
      employeeId,
      advanceId,
      dto.paymentMethod,
      (req as any).user.id,
      dto,
    );
  }

  @Get('employees/:id/bonuses')
  @ApiOperation({ summary: 'List employee bonuses' })
  async getBonuses(@Param('id') employeeId: string) {
    return this.employeesService.getBonuses(employeeId);
  }

  @Post('employees/:id/bonuses')
  @ApiOperation({ summary: 'Create employee bonus' })
  async createBonus(
    @Param('id') employeeId: string,
    @Body() dto: CreateBonusDto,
    @Req() req: Request,
  ) {
    return this.employeesService.createBonus(
      employeeId,
      dto,
      (req as any).user.id,
    );
  }

  @Post('payroll/runs')
  @Roles(RoleEnum.OWNER, RoleEnum.ACCOUNTANT)
  @ApiOperation({ summary: 'Run payroll for an employee' })
  async runPayroll(@Body() dto: RunPayrollDto, @Req() req: Request) {
    return this.employeesService.runPayroll(dto, (req as any).user.id);
  }

  @Get('payroll/runs')
  @Roles(RoleEnum.OWNER, RoleEnum.ACCOUNTANT)
  @ApiOperation({ summary: 'List payroll runs' })
  @ApiQuery({ name: 'departmentId', required: false })
  @ApiQuery({ name: 'periodMonth', required: false })
  @ApiQuery({ name: 'periodYear', required: false })
  async getPayrollRuns(
    @Query('departmentId') departmentId?: string,
    @Query('periodMonth') periodMonth?: string,
    @Query('periodYear') periodYear?: string,
  ) {
    const month = periodMonth ? parseInt(periodMonth, 10) : undefined;
    const year = periodYear ? parseInt(periodYear, 10) : undefined;
    return this.employeesService.getSalaryRuns(departmentId, month, year);
  }

  @Get('payroll/runs/:id')
  @Roles(RoleEnum.OWNER, RoleEnum.ACCOUNTANT)
  getSalaryRun(@Param('id') id: string) {
    return this.employeesService.getSalaryRun(id);
  }

  @Post('payroll/runs/:id/pay')
  @Roles(RoleEnum.OWNER, RoleEnum.ACCOUNTANT)
  @ApiOperation({ summary: 'Mark payroll run as paid' })
  async markSalaryPaid(
    @Param('id') id: string,
    @Body() dto: MarkSalaryPaymentDto,
    @Req() req: Request,
  ) {
    return this.employeesService.markSalaryPaid(
      id,
      dto.paidDate,
      dto.paymentMethod,
      (req as any).user.id,
      dto.amount,
      dto,
    );
  }

  @Get('employees/:id/salary-account')
  @Roles(RoleEnum.OWNER, RoleEnum.ACCOUNTANT)
  getSalaryAccount(@Param('id') employeeId: string) {
    return this.employeesService.getSalaryAccount(employeeId);
  }

  @Post('employees/:id/salary-account/withdrawals')
  @Roles(RoleEnum.OWNER, RoleEnum.ACCOUNTANT)
  withdrawSalary(
    @Param('id') employeeId: string,
    @Body() dto: CreateSalaryWithdrawalDto,
    @Req() req: Request,
  ) {
    return this.employeesService.withdrawSalary(
      employeeId,
      dto,
      (req as any).user.id,
    );
  }
}
