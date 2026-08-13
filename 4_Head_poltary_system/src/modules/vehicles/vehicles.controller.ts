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
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { VehiclesService } from './services/vehicles.service';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { CreateFuelLogDto } from './dto/create-fuel-log.dto';
import { CreateMaintenanceLogDto } from './dto/create-maintenance-log.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { BaseController } from '../../common/controllers/base.controller';
import { DepartmentScopeGuard } from '../../common/guards/department-scope.guard';

@ApiTags('Vehicles')
@Controller('api/v1/vehicles')
@UseGuards(JwtAuthGuard, DepartmentScopeGuard)
export class VehiclesController extends BaseController {
  constructor(private readonly vehiclesService: VehiclesService) {
    super();
  }

  @ApiBearerAuth('JWT-auth')
  @Post()
  create(@Body() dto: CreateVehicleDto) {
    return this.handleAsyncOperation(this.vehiclesService.create(dto));
  }

  @ApiBearerAuth('JWT-auth')
  @Get()
  findAll(
    @Query('page') page = '1',
    @Query('limit') limit = '20',
    @Query('departmentId') departmentId?: string,
  ) {
    return this.handleAsyncOperation(
      this.vehiclesService.findAll(Number(page), Number(limit), departmentId),
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
  createFuelLog(@Param('id') id: string, @Body() dto: CreateFuelLogDto) {
    return this.handleAsyncOperation(
      this.vehiclesService.createFuelLog(id, dto, 'system'),
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
    return { success: true, message: 'Fuel log updated', data: { id, dto } };
  }

  @ApiBearerAuth('JWT-auth')
  @Delete('fuel-logs/:id')
  deleteFuelLog(@Param('id') id: string) {
    return { success: true, message: 'Fuel log deleted', data: { id } };
  }

  @ApiBearerAuth('JWT-auth')
  @Post(':id/maintenance-logs')
  createMaintenanceLog(
    @Param('id') id: string,
    @Body() dto: CreateMaintenanceLogDto,
  ) {
    return this.handleAsyncOperation(
      this.vehiclesService.createMaintenanceLog(id, dto, 'system'),
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
    return {
      success: true,
      message: 'Maintenance log updated',
      data: { id, dto },
    };
  }

  @ApiBearerAuth('JWT-auth')
  @Delete('maintenance-logs/:id')
  deleteMaintenanceLog(@Param('id') id: string) {
    return { success: true, message: 'Maintenance log deleted', data: { id } };
  }
}
