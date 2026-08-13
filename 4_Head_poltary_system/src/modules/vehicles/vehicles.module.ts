import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VehiclesController } from './controllers/vehicles.controller';
import { VehiclesService } from './services/vehicles.service';
import { VehiclesRepository } from './repositories/vehicles.repository';
import { Vehicle } from './entities/vehicle.entity';
import { VehicleFuelLog } from './entities/vehicle-fuel-log.entity';
import { VehicleMaintenanceLog } from './entities/vehicle-maintenance-log.entity';
import { ExpensesModule } from '../expenses/expenses.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Vehicle, VehicleFuelLog, VehicleMaintenanceLog]),
    ExpensesModule,
  ],
  controllers: [VehiclesController],
  providers: [VehiclesService, VehiclesRepository],
  exports: [VehiclesService],
})
export class VehiclesModule {}
