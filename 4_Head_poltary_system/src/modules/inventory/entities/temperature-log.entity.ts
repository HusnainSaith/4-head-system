import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { StockMovement } from './stock-movement.entity';
import { Batch } from './batch.entity';

@Entity('temperature_logs')
export class TemperatureLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'stock_movement_id', nullable: true })
  stockMovementId: string;

  @ManyToOne(() => StockMovement, { nullable: true })
  @JoinColumn({ name: 'stock_movement_id' })
  stockMovement: StockMovement;

  @Column({ name: 'batch_id', nullable: true })
  batchId: string;

  @ManyToOne(() => Batch, { nullable: true })
  @JoinColumn({ name: 'batch_id' })
  batch: Batch;

  @Column({ type: 'decimal', precision: 5, scale: 2 })
  recordedTemp: number;

  @Column({ type: 'decimal', precision: 5, scale: 2 })
  threshold: number;

  @Column({
    type: 'enum',
    enum: ['NORMAL', 'WARNING', 'CRITICAL'],
  })
  status: 'NORMAL' | 'WARNING' | 'CRITICAL';

  @CreateDateColumn()
  recordedAt: Date;
}
