import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Vehicle } from './entities/vehicle.entity';
import { VehicleFuelLog } from './entities/vehicle-fuel-log.entity';
import { VehicleMaintenanceLog } from './entities/vehicle-maintenance-log.entity';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { CreateFuelLogDto } from './dto/create-fuel-log.dto';
import { CreateMaintenanceLogDto } from './dto/create-maintenance-log.dto';
import { VehiclesRepository } from './repositories/vehicles.repository';
import { ExpensesService } from '../expenses/expenses.service';
import { User } from '../users/entities/user.entity';

@Injectable()
export class VehiclesService {
  constructor(
    private readonly vehicleRepo: VehiclesRepository,
    private readonly expensesService: ExpensesService,
    private readonly dataSource: DataSource,
  ) {}

  async create(dto: CreateVehicleDto) {
    const exists = await this.vehicleRepo.findOne({
      registrationNumber: dto.registrationNumber,
    });
    if (exists) {
      throw new Error('Vehicle with this registration number already exists');
    }
    const driverName = dto.driverUserId
      ? await this.resolveDriver(dto.driverUserId, dto.departmentId)
      : dto.driverName;
    const v = this.vehicleRepo.create({ ...dto, driverName, isActive: true });
    const saved = await this.vehicleRepo.save(v);
    return { success: true, message: 'Vehicle created', data: saved };
  }

  async findAll(page = 1, limit = 20, departmentId?: string) {
    const [data, total] = await this.vehicleRepo.findAndCount({
      skip: (page - 1) * limit,
      take: limit,
      order: { createdAt: 'DESC' },
      where: departmentId ? { departmentId } : undefined,
      relations: { department: true, driverUser: true },
    });
    return {
      success: true,
      message: 'Vehicles retrieved',
      data: {
        items: data,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
          hasNextPage: page * limit < total,
          hasPreviousPage: page > 1,
        },
      },
    };
  }

  async findByDepartment(departmentId: string) {
    const vehicles = await this.vehicleRepo.find({
      where: { departmentId },
      order: { createdAt: 'DESC' },
    });
    return {
      success: true,
      message: 'Vehicles retrieved for department',
      data: vehicles,
    };
  }

  async findOne(id: string) {
    const v = await this.vehicleRepo.findOne({ id });
    if (!v) throw new NotFoundException('Vehicle not found');
    return { success: true, message: 'Vehicle retrieved', data: v };
  }

  async createFuelLog(
    vehicleId: string,
    dto: CreateFuelLogDto,
    createdBy: string,
  ) {
    return this.dataSource.transaction(async (manager) => {
      const vehicle = await manager.findOneOrFail(Vehicle, {
        where: { id: vehicleId } as any,
      });
      const totalAmount = (dto.liters * dto.ratePerLiter).toFixed(2);
      const fuelLog = await manager.save(VehicleFuelLog, {
        ...dto,
        vehicleId,
        totalAmount,
        createdBy,
      } as any);
      await this.expensesService.createSystemExpense(
        {
          departmentId: vehicle.departmentId,
          categoryName: 'Vehicle Fuel',
          amount: totalAmount,
          date: new Date(dto.fuelDate),
          sourceType: 'vehicle_fuel',
          sourceId: fuelLog.id,
          createdBy,
        },
        manager,
      );
      return fuelLog;
    });
  }

  async createMaintenanceLog(
    vehicleId: string,
    dto: CreateMaintenanceLogDto,
    createdBy: string,
  ) {
    return this.dataSource.transaction(async (manager) => {
      const vehicle = await manager.findOneOrFail(Vehicle, {
        where: { id: vehicleId } as any,
      });
      const maintenanceLog = await manager.save(VehicleMaintenanceLog, {
        ...dto,
        vehicleId,
        createdBy,
      } as any);
      await this.expensesService.createSystemExpense(
        {
          departmentId: vehicle.departmentId,
          categoryName: 'Vehicle Maintenance',
          amount: dto.cost.toFixed(2),
          date: new Date(dto.maintenanceDate),
          sourceType: 'vehicle_maintenance',
          sourceId: maintenanceLog.id,
          createdBy,
        },
        manager,
      );
      return maintenanceLog;
    });
  }

  async findFuelLogs(vehicleId: string) {
    const data = await this.vehicleRepo.findFuelLogs(vehicleId);
    return { success: true, message: 'Fuel logs retrieved', data };
  }

  async findMaintenanceLogs(vehicleId: string) {
    const data = await this.vehicleRepo.findMaintenanceLogs(vehicleId);
    return { success: true, message: 'Maintenance logs retrieved', data };
  }

  async updateVehicle(id: string, dto: Partial<CreateVehicleDto>) {
    const current = await this.vehicleRepo.findOne({ id });
    if (!current) throw new NotFoundException('Vehicle not found');
    const departmentId = dto.departmentId ?? current.departmentId;
    const driverName = dto.driverUserId
      ? await this.resolveDriver(dto.driverUserId, departmentId)
      : dto.driverName;
    await this.vehicleRepo.update(id, {
      ...dto,
      ...(dto.driverUserId ? { driverName } : {}),
    } as any);
    const updated = await this.vehicleRepo.findOne({ id });
    return { success: true, message: 'Vehicle updated', data: updated };
  }

  private async resolveDriver(userId: string, departmentId: string) {
    const driver = await this.dataSource.getRepository(User).findOne({
      where: { id: userId, isActive: true },
      relations: ['role'],
    });
    if (!driver || driver.role?.name.toUpperCase() !== 'DRIVER')
      throw new BadRequestException(
        'Selected user does not have the DRIVER role',
      );
    if (driver.departmentId && driver.departmentId !== departmentId)
      throw new BadRequestException(
        'Selected driver belongs to another department',
      );
    return driver.fullName;
  }

  async removeVehicle(id: string) {
    await this.vehicleRepo.update(id, { isActive: false });
    await this.vehicleRepo.softDelete(id);
    return { success: true, message: 'Vehicle deactivated' };
  }

  async updateFuelLog(id: string, dto: Partial<CreateFuelLogDto>) {
    const changes: Partial<VehicleFuelLog> = {
      ...dto,
      fuelDate: dto.fuelDate ? new Date(dto.fuelDate) : undefined,
      liters: dto.liters?.toFixed(2),
      ratePerLiter: dto.ratePerLiter?.toFixed(2),
      odometerReading: dto.odometerReading?.toFixed(1),
    };
    if (dto.liters !== undefined || dto.ratePerLiter !== undefined) {
      const current = await this.vehicleRepo.findFuelLog(id);
      if (!current) throw new NotFoundException('Fuel log not found');
      changes.totalAmount = (
        (dto.liters ?? Number(current.liters)) *
        (dto.ratePerLiter ?? Number(current.ratePerLiter))
      ).toFixed(2);
    }
    await this.vehicleRepo.updateFuelLog(id, changes);
    return this.vehicleRepo.findFuelLog(id);
  }
  async deleteFuelLog(id: string) {
    await this.vehicleRepo.deleteFuelLog(id);
    return { id };
  }
  async updateMaintenanceLog(
    id: string,
    dto: Partial<CreateMaintenanceLogDto>,
  ) {
    await this.vehicleRepo.updateMaintenanceLog(id, {
      ...dto,
      maintenanceDate: dto.maintenanceDate
        ? new Date(dto.maintenanceDate)
        : undefined,
      cost: dto.cost?.toFixed(2),
    });
    return this.vehicleRepo.findMaintenanceLog(id);
  }
  async deleteMaintenanceLog(id: string) {
    await this.vehicleRepo.deleteMaintenanceLog(id);
    return { id };
  }
}
