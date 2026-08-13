import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { AuditBaseEntity } from '../../../common/entities/audit-base.entity';
import { Product } from './product.entity';
import { QualityInspection } from './quality-inspection.entity';
import { Department } from '../../departments/entities/department.entity';

@Entity('batches')
export class Batch extends AuditBaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'batch_number', length: 100, unique: true })
  batchNumber: string;

  @Column({ name: 'product_id', type: 'uuid', nullable: true })
  productId?: string;

  @ManyToOne(() => Product, (product) => product.batches, { nullable: true })
  @JoinColumn({ name: 'product_id' })
  product?: Product;

  @Column({ name: 'department_id', type: 'uuid', nullable: true })
  departmentId?: string;

  @ManyToOne(() => Department, { nullable: true })
  @JoinColumn({ name: 'department_id' })
  department?: Department;

  @Column({
    name: 'initial_quantity',
    type: 'decimal',
    precision: 12,
    scale: 3,
    default: 0,
  })
  initialQuantity: string;

  @Column({
    name: 'current_quantity',
    type: 'decimal',
    precision: 12,
    scale: 3,
    default: 0,
  })
  currentQuantity: string;

  @Column({
    name: 'cost_per_unit',
    type: 'decimal',
    precision: 16,
    scale: 4,
    nullable: true,
  })
  costPerUnit?: string;

  @Column({ name: 'manufacturing_date', type: 'date', nullable: true })
  manufacturingDate?: Date;

  @Column({ name: 'expiry_date', type: 'date', nullable: true })
  expiryDate?: Date;

  @Column({
    type: 'enum',
    enum: ['AVAILABLE', 'QUARANTINED', 'CONSUMED', 'EXPIRED', 'DISPOSED'],
    default: 'AVAILABLE',
  })
  status: 'AVAILABLE' | 'QUARANTINED' | 'CONSUMED' | 'EXPIRED' | 'DISPOSED';

  @Column({
    name: 'temperature_at_receipt',
    type: 'decimal',
    precision: 5,
    scale: 2,
    nullable: true,
  })
  temperatureAtReceipt?: string;

  @Column({ type: 'text', nullable: true })
  notes?: string;

  @OneToMany(() => QualityInspection, (inspection) => inspection.batch)
  qualityInspections: QualityInspection[];
}
