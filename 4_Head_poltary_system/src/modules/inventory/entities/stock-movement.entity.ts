import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { Department } from '../../departments/entities/department.entity';
import { StockMovementSourceEnum } from '../enums/stock-movement.enum';
import { StockType } from '../enums/stock-type.enum';

@Entity('stock_movements')
@Index(['departmentId', 'movementDate'])
@Index(['sourceType', 'sourceId'])
export class StockMovement {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'department_id', type: 'uuid' })
  departmentId: string;

  @ManyToOne(() => Department, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'department_id' })
  department: Department;

  @Column({
    type: 'enum',
    enum: [
      'purchase_in',
      'sale_out',
      'transfer_in',
      'transfer_out',
      'writeoff_out',
      'opening_stock',
      'processing_loss_out',
      'dressing_out',
      'dressing_in',
    ],
    name: 'movement_type',
  })
  movementType:
    | 'purchase_in'
    | 'sale_out'
    | 'transfer_in'
    | 'transfer_out'
    | 'writeoff_out'
    | 'opening_stock'
    | 'processing_loss_out'
    | 'dressing_out'
    | 'dressing_in';

  @Column({
    name: 'stock_type',
    type: 'enum',
    enum: StockType,
    default: StockType.STANDARD,
  })
  stockType: StockType;

  @Column({ type: 'decimal', precision: 12, scale: 3, name: 'quantity_kg' })
  quantityKg: string; // Always positive; direction implied by movement_type

  @Column({ type: 'decimal', precision: 16, scale: 4, name: 'rate_per_kg' })
  ratePerKg: string; // Purchase rate, or WAC at time of sale/transfer/writeoff

  @Column({ type: 'decimal', precision: 16, scale: 4, name: 'resulting_wac' })
  resultingWac: string; // Snapshot of WAC after this movement

  @Column({
    type: 'enum',
    enum: StockMovementSourceEnum,
    name: 'source_type',
  })
  sourceType: StockMovementSourceEnum;

  // sourceType identifies the originating business document (`purchase`,
  // `sale`, etc.); movementType independently records inventory direction
  // (`purchase_in`, `sale_out`, etc.). They are intentionally not the same enum.

  @Column({ name: 'source_id', type: 'uuid' })
  sourceId: string; // Polymorphic reference to source transaction

  @Column({ name: 'movement_date', type: 'date' })
  movementDate: Date;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  createdBy?: string;
  // NO updatedAt, NO deletedAt — IMMUTABLE, append-only table

  // Optional polymorphic references (may be used by services)
  purchaseId?: string;
  saleId?: string;

  // Optional product relation placeholder for legacy queries
  productId?: string;
  product?: any;
}
