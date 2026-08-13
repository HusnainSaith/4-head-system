import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Patch,
  Delete,
  UseGuards,
  Query,
  Req,
  ForbiddenException,
} from '@nestjs/common';
import type { Request } from 'express';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { CreateUserWithPermissionsDto } from './dto/create-user-with-permissions.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { AssignPermissionsDto } from './dto/assign-permissions.dto';
import { RolesGuard } from '../../common/guards/roles.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RoleEnum } from '../../common/enums/role.enum';
import { SecurityUtil } from '../../common/utils/security.util';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiTags,
  ApiQuery,
} from '@nestjs/swagger';
import { BaseController } from '../../common/controllers/base.controller';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(RoleEnum.OWNER)
@ApiTags('Users')
@Controller('users')
export class UsersController extends BaseController {
  constructor(private readonly usersService: UsersService) {
    super();
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'create users' })
  @Permissions('users.create')
  create(@Body() dto: CreateUserDto) {
    return this.handleAsyncOperation(this.usersService.create(dto));
  }

  @Post('with-permissions')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'create user with permissions' })
  @Permissions('users.create')
  createWithPermissions(@Body() dto: CreateUserWithPermissionsDto) {
    return this.handleAsyncOperation(
      this.usersService.createWithPermissions(dto),
    );
  }

  @Post(':id/permissions')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'assign permissions to user by id' })
  @Permissions('users.update')
  assignPermissions(
    @Param('id') id: string,
    @Body() dto: AssignPermissionsDto,
  ) {
    const validId = SecurityUtil.validateId(id);
    return this.handleAsyncOperation(
      this.usersService.assignPermissions(validId, dto),
    );
  }

  @Get(':id/permissions')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'get user permissions by id' })
  @Permissions('users.read')
  getUserPermissions(@Param('id') id: string) {
    const validId = SecurityUtil.validateId(id);
    return this.handleAsyncOperation(
      this.usersService.getUserPermissions(validId),
    );
  }
  @Get('available-features')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'get all features' })
  @Permissions('users.read')
  getAvailableFeatures() {
    return this.handleAsyncOperation(this.usersService.getAvailableFeatures());
  }

  // Get available actions for a specific feature
  @Get('available-features/:feature/actions')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get permidssion of any feature' })
  @Permissions('users.read')
  getAvailableActionsForFeature(@Param('feature') feature: string) {
    return this.handleAsyncOperation(
      this.usersService.getAvailableActionsForFeature(feature),
    );
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get users' })
  @Permissions('users.read')
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'roleId', required: false })
  @ApiQuery({ name: 'departmentId', required: false })
  findAll(
    @Query('search') search?: string,
    @Query('roleId') roleId?: string,
    @Query('departmentId') departmentId?: string,
  ) {
    return this.handleAsyncOperation(
      this.usersService.findAll({ search, roleId, departmentId }),
    );
  }

  @Get('roles')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get assignable application roles' })
  @Permissions('users.read')
  getAssignableRoles() {
    return this.handleAsyncOperation(this.usersService.getAssignableRoles());
  }

  // ==================== PERSONNEL MANAGEMENT ENDPOINTS ====================

  @Get('employees')
  @Roles(RoleEnum.OWNER, RoleEnum.ACCOUNTANT, RoleEnum.DEPARTMENT_STAFF)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get all employees (monthly salary)' })
  @ApiQuery({ name: 'departmentId', required: false })
  getEmployees(
    @Query('departmentId') departmentId: string | undefined,
    @Req()
    req: Request & {
      user: { role?: { name?: string }; departmentId?: string };
    },
  ) {
    const scopedDepartment =
      req.user.role?.name?.toLowerCase() === RoleEnum.DEPARTMENT_STAFF
        ? req.user.departmentId
        : departmentId;
    if (
      req.user.role?.name?.toLowerCase() === RoleEnum.DEPARTMENT_STAFF &&
      !scopedDepartment
    )
      throw new ForbiddenException('Department assignment is required');
    return this.handleAsyncOperation(
      this.usersService.findEmployees(scopedDepartment),
    );
  }

  @Get('workers')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get all workers (daily wage)' })
  @ApiQuery({ name: 'departmentId', required: false })
  @Permissions('users.read')
  getWorkers(@Query('departmentId') departmentId?: string) {
    return this.handleAsyncOperation(
      this.usersService.findWorkers(departmentId),
    );
  }

  @Get('drivers')
  @Roles(RoleEnum.OWNER, RoleEnum.ACCOUNTANT, RoleEnum.DEPARTMENT_STAFF)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get all drivers' })
  @ApiQuery({ name: 'departmentId', required: false })
  getDrivers(
    @Query('departmentId') departmentId: string | undefined,
    @Req()
    req: Request & {
      user: { role?: { name?: string }; departmentId?: string };
    },
  ) {
    const scopedDepartment =
      req.user.role?.name?.toLowerCase() === RoleEnum.DEPARTMENT_STAFF
        ? req.user.departmentId
        : departmentId;
    if (
      req.user.role?.name?.toLowerCase() === RoleEnum.DEPARTMENT_STAFF &&
      !scopedDepartment
    )
      throw new ForbiddenException('Department assignment is required');
    return this.handleAsyncOperation(
      this.usersService.findDrivers(scopedDepartment),
    );
  }

  @Get('party-users')
  @Roles(RoleEnum.OWNER, RoleEnum.ACCOUNTANT, RoleEnum.DEPARTMENT_STAFF)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get active users assigned to a party role' })
  getPartyUsers() {
    return this.handleAsyncOperation(this.usersService.findPartyUsers());
  }

  @Get('department/:departmentId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get all users by department' })
  @Permissions('users.read')
  getUsersByDepartment(@Param('departmentId') departmentId: string) {
    const validId = SecurityUtil.validateId(departmentId);
    return this.handleAsyncOperation(
      this.usersService.findByDepartment(validId),
    );
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'get user by id' })
  @Permissions('users.read')
  findOne(@Param('id') id: string) {
    const validId = SecurityUtil.validateId(id);
    return this.handleAsyncOperation(this.usersService.findOne(validId));
  }

  @Get(':id/salary-details')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get salary details for user' })
  @Permissions('users.read')
  getSalaryDetails(@Param('id') id: string) {
    const validId = SecurityUtil.validateId(id);
    return this.handleAsyncOperation(
      this.usersService.getSalaryDetails(validId),
    );
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'update user by id' })
  @Permissions('users.update')
  update(@Param('id') id: string, @Body() dto: UpdateUserDto) {
    const validId = SecurityUtil.validateId(id);
    return this.handleAsyncOperation(this.usersService.update(validId, dto));
  }

  @Patch(':id/activate')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'activate user by id' })
  @Permissions('users.update')
  activate(@Param('id') id: string) {
    const validId = SecurityUtil.validateId(id);
    return this.handleAsyncOperation(this.usersService.activate(validId));
  }

  @Patch(':id/assign-department')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Assign user to department' })
  @Permissions('users.update')
  assignDepartment(
    @Param('id') id: string,
    @Body('departmentId') departmentId: string,
  ) {
    const validId = SecurityUtil.validateId(id);
    const validDepartmentId = SecurityUtil.validateId(departmentId);
    return this.handleAsyncOperation(
      this.usersService.assignDepartment(validId, validDepartmentId),
    );
  }

  @Patch(':id/update-salary')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Update monthly salary for user' })
  @Permissions('users.update')
  updateSalary(@Param('id') id: string, @Body('salary') salary: number) {
    const validId = SecurityUtil.validateId(id);
    return this.handleAsyncOperation(
      this.usersService.updateSalary(validId, salary),
    );
  }

  @Patch(':id/update-daily-wage')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Update daily wage for user' })
  @Permissions('users.update')
  updateDailyWage(@Param('id') id: string, @Body('wage') wage: number) {
    const validId = SecurityUtil.validateId(id);
    return this.handleAsyncOperation(
      this.usersService.updateDailyWage(validId, wage),
    );
  }

  @Post(':id/resignation')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Record user resignation' })
  @Permissions('users.update')
  recordResignation(
    @Param('id') id: string,
    @Body('resignationDate') resignationDate: Date,
  ) {
    const validId = SecurityUtil.validateId(id);
    return this.handleAsyncOperation(
      this.usersService.recordResignation(validId, resignationDate),
    );
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'delete user by id' })
  @Permissions('users.delete')
  remove(@Param('id') id: string) {
    const validId = SecurityUtil.validateId(id);
    return this.handleAsyncOperation(this.usersService.remove(validId));
  }

  //   @Get('profile')
  // @UseGuards(JwtAuthGuard)
  // async getUserProfile(@Request() req: any) {
  //   const userId = req.user?.id;
  //   const user = await this.usersService.findOneWithPermissions(userId);
  //   if (!user) {
  //     throw new NotFoundException('User not found');
  //   }
  //   return {
  //     success: true,
  //     message: 'User profile retrieved successfully',
  //     data: user,
  //   };
  // }
}
