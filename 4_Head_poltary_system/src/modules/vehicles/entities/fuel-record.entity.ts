import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { AuditBaseEntity } from '../../../common/entities/audit-base.entity';
import { Vehicle } from './vehicle.entity';

@Entity('vehicle_fuel_logs')
export class VehicleFuelLog extends AuditBaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'vehicle_id', type: 'uuid' })
  vehicleId: string;

  @ManyToOne(() => Vehicle, (vehicle) => vehicle.fuelLogs)
  @JoinColumn({ name: 'vehicle_id' })
  vehicle: Vehicle;

  @Column({ name: 'fuel_date', type: 'date' })
  fuelDate: Date;

  @Column({ type: 'decimal', precision: 8, scale: 2 })
  liters: string;

  @Column({ name: 'rate_per_liter', type: 'decimal', precision: 10, scale: 2 })
  ratePerLiter: string;

  @Column({ name: 'total_amount', type: 'decimal', precision: 12, scale: 2 })
  totalAmount: string;

  @Column({
    name: 'odometer_reading',
    type: 'decimal',
    precision: 10,
    scale: 1,
    nullable: true,
  })
  odometerReading?: string;

  @Column({ name: 'payment_method', type: 'enum', enum: ['cash', 'bank'] })
  paymentMethod: string;

  @Column({ nullable: true })
  notes?: string;
}
