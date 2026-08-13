import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { AuditBaseEntity } from '../../../common/entities/audit-base.entity';
import { Department } from '../../departments/entities/department.entity';
import { VehicleFuelLog } from './vehicle-fuel-log.entity';
import { VehicleMaintenanceLog } from './vehicle-maintenance-log.entity';
import { User } from '../../users/entities/user.entity';

export enum VehicleTypeEnum {
  TRUCK = 'truck',
  VAN = 'van',
  CAR = 'car',
  MOTORCYCLE = 'motorcycle',
  OTHER = 'other',
}

@Entity('vehicles')
export class Vehicle extends AuditBaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  registrationNumber: string;

  @Column({
    type: 'enum',
    enum: VehicleTypeEnum,
    name: 'vehicle_type',
  })
  vehicleType: VehicleTypeEnum;

  @Column({ nullable: true })
  model?: string;

  @Column({ type: 'int', nullable: true })
  year?: number;

  @Column({ name: 'driver_name', nullable: true })
  driverName?: string;

  @Column({ name: 'driver_user_id', type: 'uuid', nullable: true })
  driverUserId?: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'driver_user_id' })
  driverUser?: User;

  @Column({ type: 'varchar', length: 255, nullable: true })
  notes?: string;

  @Column({ name: 'department_id', type: 'uuid' })
  departmentId: string;

  @ManyToOne(() => Department, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'department_id' })
  department: Department;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @OneToMany(() => VehicleFuelLog, (fuelLog) => fuelLog.vehicle)
  fuelLogs: VehicleFuelLog[];

  @OneToMany(
    () => VehicleMaintenanceLog,
    (maintenanceLog) => maintenanceLog.vehicle,
  )
  maintenanceLogs: VehicleMaintenanceLog[];
}
