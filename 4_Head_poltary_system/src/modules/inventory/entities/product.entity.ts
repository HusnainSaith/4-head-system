import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  Index,
} from 'typeorm';
import { AuditBaseEntity } from '../../../common/entities/audit-base.entity';
import { StockBalance } from './stock-balance.entity';
import { Batch } from './batch.entity';

@Entity('products')
@Index(['name'])
@Index(['sku'])
export class Product extends AuditBaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true, length: 100 })
  sku: string;

  @Column({ length: 200 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  /** Unit of measurement - MVP is kg-only but stored for future expansion */
  @Column({ type: 'varchar', length: 50, default: 'kg' })
  unit: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  category?: string;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ type: 'decimal', precision: 14, scale: 2, nullable: true })
  minPrice?: string;

  @Column({ type: 'decimal', precision: 14, scale: 2, nullable: true })
  maxPrice?: string;

  /** Product status: active, inactive, discontinued */
  @Column({ type: 'varchar', length: 50, nullable: true })
  status?: string;

  @Column({ type: 'text', nullable: true })
  notes?: string;

  @OneToMany(() => StockBalance, (stockBalance) => stockBalance.product)
  stockBalances: StockBalance[];

  @OneToMany(() => Batch, (batch) => batch.product)
  batches: Batch[];
}
