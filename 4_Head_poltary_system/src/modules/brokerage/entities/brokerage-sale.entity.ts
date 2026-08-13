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

export enum BrokerageSaleStatus {
  ACTIVE = 'active',
  CANCELLED = 'cancelled',
}

export enum BrokerageSaleDestination {
  EXTERNAL = 'external',
  SUPPLY = 'supply',
}

@Entity('brokerage_sales')
export class BrokerageSale extends AuditBaseEntity {
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
    name: 'commission_per_kg',
    type: 'decimal',
    precision: 14,
    scale: 2,
  })
  commissionPerKg: string;

  @Column({
    name: 'commission_amount',
    type: 'decimal',
    precision: 14,
    scale: 2,
  })
  commissionAmount: string;

  @Column({
    name: 'amount_received',
    type: 'decimal',
    precision: 14,
    scale: 2,
    default: '0',
  })
  amountReceived: string;

  @Column({
    name: 'outstanding_amount',
    type: 'decimal',
    precision: 14,
    scale: 2,
    default: '0',
  })
  outstandingAmount: string;

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

  @Column({
    name: 'destination_type',
    type: 'varchar',
    length: 20,
    default: BrokerageSaleDestination.EXTERNAL,
  })
  destinationType: BrokerageSaleDestination;

  @Column({ name: 'sale_date', type: 'date' })
  saleDate: Date;

  @Column({ type: 'varchar', length: 255, nullable: true })
  description?: string;

  @Column({
    type: 'enum',
    enum: BrokerageSaleStatus,
    default: BrokerageSaleStatus.ACTIVE,
  })
  status: BrokerageSaleStatus;

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
