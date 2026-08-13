import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Unique,
  ManyToOne,
  JoinColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Product } from './product.entity';
import { StockType } from '../enums/stock-type.enum';

@Entity('stock_balances')
@Unique(['departmentId', 'stockType'])
export class StockBalance {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'product_id', type: 'uuid' })
  productId: string;

  @ManyToOne(() => Product, (product) => product.stockBalances)
  @JoinColumn({ name: 'product_id' })
  product: Product;

  @Column({ name: 'department_id', type: 'uuid' })
  departmentId: string;

  @Column({
    name: 'stock_type',
    type: 'enum',
    enum: StockType,
    default: StockType.STANDARD,
  })
  stockType: StockType;

  @Column({
    type: 'decimal',
    precision: 12,
    scale: 3,
    name: 'quantity_kg',
    default: 0,
  })
  quantityKg: string; // DECIMAL(12,3)

  @Column({ type: 'decimal', precision: 16, scale: 4, name: 'wac', default: 0 })
  wac: string;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @Column({ name: 'updated_by', type: 'uuid', nullable: true })
  updatedBy?: string;
}
