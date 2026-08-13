import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { AuditBaseEntity } from '../../../common/entities/audit-base.entity';
import { Department } from '../../departments/entities/department.entity';
import { StockType } from '../enums/stock-type.enum';

@Entity('stock_writeoffs')
export class StockWriteoff extends AuditBaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'department_id', type: 'uuid' })
  departmentId: string;

  @ManyToOne(() => Department, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'department_id' })
  department: Department;

  @Column({
    name: 'stock_type',
    type: 'enum',
    enum: StockType,
    default: StockType.STANDARD,
  })
  stockType: StockType;

  @Column({ type: 'decimal', precision: 12, scale: 3, name: 'quantity_kg' })
  quantityKg: string;

  @Column({
    type: 'enum',
    enum: ['spoilage', 'mortality', 'transit_loss', 'other'],
  })
  reason: 'spoilage' | 'mortality' | 'transit_loss' | 'other';

  @Column({ type: 'varchar', length: 255, nullable: true })
  note?: string;

  @Column({ name: 'writeoff_date', type: 'date' })
  writeoffDate: Date;

  @Column({
    type: 'decimal',
    precision: 14,
    scale: 2,
    name: 'valuation_amount',
  })
  valuationAmount: string;
}
