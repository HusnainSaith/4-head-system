import {
  Controller,
  Post,
  Body,
  UseGuards,
  Get,
  Query,
  Param,
  Patch,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ExpensesService } from './expenses.service';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { UpdateExpenseDto } from './dto/update-expense.dto';
import { CreateExpenseCategoryDto } from './dto/create-expense-category.dto';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { RoleEnum } from '../../common/enums/role.enum';
import { DepartmentScopeGuard } from '../../common/guards/department-scope.guard';

@ApiTags('Expenses')
@ApiBearerAuth('JWT-auth')
@Controller('expenses')
@UseGuards(JwtAuthGuard, RolesGuard, DepartmentScopeGuard)
@Roles(RoleEnum.OWNER, RoleEnum.ACCOUNTANT, RoleEnum.DEPARTMENT_STAFF)
export class ExpensesController {
  constructor(private readonly svc: ExpensesService) {}

  @Post()
  @ApiOperation({ summary: 'Create centralized expense' })
  async create(@Body() dto: CreateExpenseDto, @Req() req: Request) {
    const user = (req as any).user;
    if (user.role?.name === RoleEnum.DEPARTMENT_STAFF)
      dto.departmentId = user.departmentId;
    return this.svc.create(dto as any, user.id);
  }

  @Get()
  @ApiOperation({ summary: 'List expenses, optionally by department' })
  async findAll(
    @Query('departmentId') departmentId: string | undefined,
    @Req() req: Request,
  ) {
    const user = (req as any).user;
    if (user.role?.name === RoleEnum.DEPARTMENT_STAFF)
      departmentId = user.departmentId;
    return this.svc.findAll(departmentId);
  }

  @Get('categories/list')
  categories() {
    return this.svc.getCategories();
  }

  @Post('categories')
  @Roles(RoleEnum.OWNER, RoleEnum.ACCOUNTANT)
  createCategory(@Body() dto: CreateExpenseCategoryDto) {
    return this.svc.createCategory(dto);
  }

  @Patch('categories/:id')
  @Roles(RoleEnum.OWNER, RoleEnum.ACCOUNTANT)
  updateCategory(@Param('id') id: string, @Body() dto: any) {
    return this.svc.updateCategory(id, dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get expense by id' })
  async findOne(@Param('id') id: string) {
    return this.svc.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a manual expense' })
  async update(@Param('id') id: string, @Body() dto: UpdateExpenseDto, @Req() req: Request) {
    const user = (req as any).user;
    if (user.role?.name === RoleEnum.DEPARTMENT_STAFF) dto.departmentId = user.departmentId;
    return this.svc.update(id, dto, user.id);
  }
}
