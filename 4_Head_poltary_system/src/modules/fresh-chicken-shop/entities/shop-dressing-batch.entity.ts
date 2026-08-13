import { Check, Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { AuditBaseEntity } from '../../../common/entities/audit-base.entity';

@Entity('shop_dressing_batches')
@Check('CHK_shop_dressing_batch_live_positive', 'live_weight_kg > 0')
@Check(
  'CHK_shop_dressing_batch_dressed_valid',
  'dressed_weight_kg > 0 AND dressed_weight_kg <= live_weight_kg',
)
export class ShopDressingBatch extends AuditBaseEntity {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ name: 'department_id', type: 'uuid' }) departmentId: string;
  @Column({ name: 'live_weight_kg', type: 'decimal', precision: 12, scale: 3 })
  liveWeightKg: string;
  @Column({
    name: 'dressed_weight_kg',
    type: 'decimal',
    precision: 12,
    scale: 3,
  })
  dressedWeightKg: string;
  @Column({
    name: 'shrinkage_kg',
    type: 'decimal',
    precision: 12,
    scale: 3,
    asExpression: 'live_weight_kg - dressed_weight_kg',
    generatedType: 'STORED',
  })
  shrinkageKg: string;
  @Column({
    name: 'live_wac_at_processing',
    type: 'decimal',
    precision: 16,
    scale: 4,
  })
  liveWacAtProcessing: string;
  @Column({
    name: 'dressed_cost_per_kg',
    type: 'decimal',
    precision: 16,
    scale: 4,
  })
  dressedCostPerKg: string;
  @Column({
    name: 'processing_loss_amount',
    type: 'decimal',
    precision: 14,
    scale: 2,
  })
  processingLossAmount: string;
  @Column({ name: 'batch_date', type: 'date' }) batchDate: Date;
  @Column({ type: 'varchar', length: 255, nullable: true }) notes?: string;
}
