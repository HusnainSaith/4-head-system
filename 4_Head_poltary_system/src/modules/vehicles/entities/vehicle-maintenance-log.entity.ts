import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { AuditBaseEntity } from '../../../common/entities/audit-base.entity';
import { Vehicle } from './vehicle.entity';

@Entity('vehicle_maintenance_logs')
export class VehicleMaintenanceLog extends AuditBaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'vehicle_id', type: 'uuid' })
  vehicleId: string;

  @ManyToOne(() => Vehicle, (vehicle) => vehicle.maintenanceLogs)
  @JoinColumn({ name: 'vehicle_id' })
  vehicle: Vehicle;

  @Column({ name: 'maintenance_date', type: 'date' })
  maintenanceDate: Date;

  @Column({ name: 'maintenance_type' })
  maintenanceType: string;

  @Column({ nullable: true })
  description?: string;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  cost: string;

  @Column({ name: 'vendor_name', nullable: true })
  vendorName?: string;

  @Column({ name: 'payment_method', type: 'enum', enum: ['cash', 'bank'] })
  paymentMethod: string;
}
