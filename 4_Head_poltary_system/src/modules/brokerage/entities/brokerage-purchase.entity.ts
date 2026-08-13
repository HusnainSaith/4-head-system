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

export enum BrokeragePurchaseStatus {
  ACTIVE = 'active',
  CANCELLED = 'cancelled',
}

@Entity('brokerage_purchases')
export class BrokeragePurchase extends AuditBaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'department_id', type: 'uuid' })
  departmentId: string;

  @ManyToOne(() => Department, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'department_id' })
  department: Department;

  @Column({ name: 'party_id', type: 'uuid', nullable: true })
  partyId?: string;

  @ManyToOne(() => Party, {
    nullable: true,
    eager: false,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'party_id' })
  party?: Party;

  @Column({ name: 'vehicle_id', type: 'uuid', nullable: true })
  vehicleId?: string;

  @ManyToOne(() => Vehicle, { nullable: true, eager: false })
  @JoinColumn({ name: 'vehicle_id' })
  vehicle?: Vehicle;

  @Column({ name: 'quantity_kg', type: 'decimal', precision: 12, scale: 3 })
  quantityKg: string;

  @Column({ name: 'rate_per_kg', type: 'decimal', precision: 14, scale: 2 })
  ratePerKg: string;

  @Column({ name: 'total_amount', type: 'decimal', precision: 14, scale: 2 })
  totalAmount: string;

  @Column({
    name: 'amount_paid',
    type: 'decimal',
    precision: 14,
    scale: 2,
    default: '0',
  })
  amountPaid: string;

  @Column({
    name: 'outstanding_amount',
    type: 'decimal',
    precision: 14,
    scale: 2,
    default: '0',
  })
  outstandingAmount: string;

  /** Portion settled by transferring the farm payable to an investor. */
  @Column({
    name: 'financed_amount',
    type: 'decimal',
    precision: 14,
    scale: 2,
    default: '0',
  })
  financedAmount: string;

  @Column({
    name: 'payment_method',
    type: 'enum',
    enum: ['cash', 'credit'],
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

  @Column({ name: 'purchase_date', type: 'date' })
  purchaseDate: Date;

  @Column({ type: 'varchar', length: 255, nullable: true })
  description?: string;

  @Column({
    type: 'enum',
    enum: BrokeragePurchaseStatus,
    default: BrokeragePurchaseStatus.ACTIVE,
  })
  status: BrokeragePurchaseStatus;

  @Column({ name: 'cancelled_at', type: 'timestamptz', nullable: true })
  cancelledAt?: Date;

  @Column({ name: 'cancelled_by', type: 'uuid', nullable: true })
  cancelledBy?: string;

  @Column({
    name: 'cancellation_reason',
    type: 'varchar',
    length: 500,
    nullable: true,
  })
  cancellationReason?: string;
}
