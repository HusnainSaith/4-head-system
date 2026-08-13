import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { AuditBaseEntity } from '../../../common/entities/audit-base.entity';
import { Department } from '../../departments/entities/department.entity';
import { Party } from '../../parties/entities/party.entity';
import { Vehicle } from '../../vehicles/entities/vehicle.entity';

@Entity('supply_purchases')
export class SupplyPurchase extends AuditBaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'department_id', type: 'uuid' })
  departmentId: string;

  @ManyToOne(() => Department, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'department_id' })
  department: Department;

  @Column({ name: 'party_id', type: 'uuid', nullable: true })
  partyId?: string;

  @ManyToOne(() => Party, { nullable: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'party_id' })
  party?: Party;

  @Column({ name: 'quantity_kg', type: 'decimal', precision: 12, scale: 3 })
  quantityKg: string;

  @Column({ name: 'rate_per_kg', type: 'decimal', precision: 14, scale: 2 })
  ratePerKg: string;

  @Column({ name: 'total_amount', type: 'decimal', precision: 14, scale: 2 })
  totalAmount: string;

  @Column({
    name: 'payment_method',
    type: 'enum',
    enum: ['cash', 'bank', 'credit'],
  })
  paymentMethod: 'cash' | 'bank' | 'credit';

  @Column({ name: 'cash_account_id', type: 'uuid', nullable: true })
  cashAccountId?: string;
  @Column({ name: 'bank_account_id', type: 'uuid', nullable: true })
  bankAccountId?: string;
  @Column({
    name: 'bank_transaction_method',
    type: 'enum',
    enum: ['cheque', 'app'],
    nullable: true,
  })
  bankTransactionMethod?: 'cheque' | 'app';
  @Column({ name: 'cheque_number', nullable: true }) chequeNumber?: string;
  @Column({ name: 'app_reference', nullable: true }) appReference?: string;

  @Column({
    name: 'amount_paid',
    type: 'decimal',
    precision: 14,
    scale: 2,
    default: 0,
  })
  amountPaid: string;

  @Column({
    name: 'outstanding_amount',
    type: 'decimal',
    precision: 14,
    scale: 2,
    default: 0,
  })
  outstandingAmount: string;

  @Column({ name: 'purchase_date', type: 'date' })
  purchaseDate: Date;

  @Column({ name: 'vehicle_id', type: 'uuid', nullable: true })
  vehicleId?: string;

  /** Present only for purchases generated atomically by a Brokerage sale. */
  @Column({ name: 'source_brokerage_sale_id', type: 'uuid', nullable: true })
  sourceBrokerageSaleId?: string;

  @ManyToOne(() => Vehicle, { nullable: true })
  @JoinColumn({ name: 'vehicle_id' })
  vehicle?: Vehicle;

  @Column({ type: 'varchar', length: 20, default: 'posted' })
  status: 'posted' | 'cancelled';

  @Column({ name: 'cancelled_at', type: 'timestamptz', nullable: true })
  cancelledAt?: Date;

  @Column({ name: 'cancelled_by', type: 'uuid', nullable: true })
  cancelledBy?: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  notes?: string;
}
