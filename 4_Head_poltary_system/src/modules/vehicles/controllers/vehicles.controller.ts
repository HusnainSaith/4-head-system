import {
  Controller,
  Post,
  Body,
  Get,
  Query,
  Param,
  UseGuards,
  Patch,
  Delete,
  Req,
  ForbiddenException,
} from '@nestjs/common';
import { Request } from 'express';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { VehiclesService } from '../services/vehicles.service';
import { CreateVehicleDto } from '../dto/create-vehicle.dto';
import { CreateFuelLogDto } from '../dto/create-fuel-log.dto';
import { CreateMaintenanceLogDto } from '../dto/create-maintenance-log.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { BaseController } from '../../../common/controllers/base.controller';

@ApiTags('Vehicles')
@Controller('api/v1/vehicles')
@UseGuards(JwtAuthGuard)
export class VehiclesController extends BaseController {
  constructor(private readonly vehiclesService: VehiclesService) {
    super();
  }

  @ApiBearerAuth('JWT-auth')
  @Post()
  create(
    @Body() dto: CreateVehicleDto,
    @Req()
    request?: Request & {
      user: { role?: { name?: string }; departmentId?: string };
    },
  ) {
    if (request?.user.role?.name === 'department_staff') {
      if (!request.user.departmentId)
        throw new ForbiddenException('Department assignment is required');
      dto.departmentId = request.user.departmentId;
    }
    return this.handleAsyncOperation(this.vehiclesService.create(dto));
  }

  @ApiBearerAuth('JWT-auth')
  @Get()
  findAll(
    @Query('page') page = '1',
    @Query('limit') limit = '20',
    @Query('departmentId') departmentId?: string,
    @Req()
    request?: Request & {
      user: { role?: { name?: string }; departmentId?: string };
    },
  ) {
    const scopedDepartment =
      request?.user.role?.name === 'department_staff'
        ? request.user.departmentId
        : departmentId;
    if (request?.user.role?.name === 'department_staff' && !scopedDepartment)
      throw new ForbiddenException('Department assignment is required');
    return this.handleAsyncOperation(
      this.vehiclesService.findAll(
        Number(page),
        Number(limit),
        scopedDepartment,
      ),
    );
  }

  @ApiBearerAuth('JWT-auth')
  @Get('department/:departmentId')
  findByDepartment(@Param('departmentId') departmentId: string) {
    return this.handleAsyncOperation(
      this.vehiclesService.findByDepartment(departmentId),
    );
  }

  @ApiBearerAuth('JWT-auth')
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.handleAsyncOperation(this.vehiclesService.findOne(id));
  }

  @ApiBearerAuth('JWT-auth')
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: Partial<CreateVehicleDto>) {
    return this.handleAsyncOperation(
      this.vehiclesService.updateVehicle(id, dto),
    );
  }

  @ApiBearerAuth('JWT-auth')
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.handleAsyncOperation(this.vehiclesService.removeVehicle(id));
  }

  @ApiBearerAuth('JWT-auth')
  @Post(':id/fuel-logs')
  createFuelLog(
    @Param('id') id: string,
    @Body() dto: CreateFuelLogDto,
    @Req() request: Request & { user: { id: string } },
  ) {
    return this.handleAsyncOperation(
      this.vehiclesService.createFuelLog(id, dto, request.user.id),
    );
  }

  @ApiBearerAuth('JWT-auth')
  @Get(':id/fuel-logs')
  findFuelLogs(@Param('id') id: string) {
    return this.handleAsyncOperation(this.vehiclesService.findFuelLogs(id));
  }

  @ApiBearerAuth('JWT-auth')
  @Patch('fuel-logs/:id')
  updateFuelLog(
    @Param('id') id: string,
    @Body() dto: Partial<CreateFuelLogDto>,
  ) {
    return this.handleAsyncOperation(
      this.vehiclesService.updateFuelLog(id, dto),
    );
  }

  @ApiBearerAuth('JWT-auth')
  @Delete('fuel-logs/:id')
  deleteFuelLog(@Param('id') id: string) {
    return this.handleAsyncOperation(this.vehiclesService.deleteFuelLog(id));
  }

  @ApiBearerAuth('JWT-auth')
  @Post(':id/maintenance-logs')
  createMaintenanceLog(
    @Param('id') id: string,
    @Body() dto: CreateMaintenanceLogDto,
    @Req() request: Request & { user: { id: string } },
  ) {
    return this.handleAsyncOperation(
      this.vehiclesService.createMaintenanceLog(id, dto, request.user.id),
    );
  }

  @ApiBearerAuth('JWT-auth')
  @Get(':id/maintenance-logs')
  findMaintenanceLogs(@Param('id') id: string) {
    return this.handleAsyncOperation(
      this.vehiclesService.findMaintenanceLogs(id),
    );
  }

  @ApiBearerAuth('JWT-auth')
  @Patch('maintenance-logs/:id')
  updateMaintenanceLog(
    @Param('id') id: string,
    @Body() dto: Partial<CreateMaintenanceLogDto>,
  ) {
    return this.handleAsyncOperation(
      this.vehiclesService.updateMaintenanceLog(id, dto),
    );
  }

  @ApiBearerAuth('JWT-auth')
  @Delete('maintenance-logs/:id')
  deleteMaintenanceLog(@Param('id') id: string) {
    return this.handleAsyncOperation(
      this.vehiclesService.deleteMaintenanceLog(id),
    );
  }
}
