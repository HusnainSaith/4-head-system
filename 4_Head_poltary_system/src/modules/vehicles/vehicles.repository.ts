import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Vehicle } from './entities/vehicle.entity';
import { VehicleFuelLog } from './entities/vehicle-fuel-log.entity';
import { VehicleMaintenanceLog } from './entities/vehicle-maintenance-log.entity';

@Injectable()
export class VehiclesRepository {
  constructor(
    @InjectRepository(Vehicle)
    private readonly repo: Repository<Vehicle>,
    @InjectRepository(VehicleFuelLog)
    private readonly fuelLogRepo: Repository<VehicleFuelLog>,
    @InjectRepository(VehicleMaintenanceLog)
    private readonly maintenanceRepo: Repository<VehicleMaintenanceLog>,
  ) {}

  create(dto: Partial<Vehicle>): Vehicle {
    return this.repo.create(dto);
  }

  save(entity: Vehicle) {
    return this.repo.save(entity);
  }

  update(id: string, data: Partial<Vehicle>) {
    return this.repo.update({ id } as any, data as any);
  }

  softDelete(id: string) {
    return this.repo.softDelete(id);
  }

  findFuelLogs(vehicleId: string) {
    return this.fuelLogRepo.find({
      where: { vehicleId },
      order: { fuelDate: 'DESC' },
    });
  }

  findMaintenanceLogs(vehicleId: string) {
    return this.maintenanceRepo.find({
      where: { vehicleId },
      order: { maintenanceDate: 'DESC' },
    });
  }

  updateFuelLog(id: string, data: Partial<VehicleFuelLog>) {
    return this.fuelLogRepo.update({ id }, data);
  }
  findFuelLog(id: string) {
    return this.fuelLogRepo.findOne({ where: { id } });
  }
  deleteFuelLog(id: string) {
    return this.fuelLogRepo.softDelete(id);
  }
  updateMaintenanceLog(id: string, data: Partial<VehicleMaintenanceLog>) {
    return this.maintenanceRepo.update({ id }, data);
  }
  findMaintenanceLog(id: string) {
    return this.maintenanceRepo.findOne({ where: { id } });
  }
  deleteMaintenanceLog(id: string) {
    return this.maintenanceRepo.softDelete(id);
  }

  findOne(where: any) {
    return this.repo.findOne({ where });
  }

  findAndCount(options: any) {
    return this.repo.findAndCount(options);
  }

  find(options: any) {
    return this.repo.find(options);
  }
}
