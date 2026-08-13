import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { AuditBaseEntity } from '../../../common/entities/audit-base.entity';
import { Department } from '../../departments/entities/department.entity';
import { Vehicle } from '../../vehicles/entities/vehicle.entity';

@Entity('internal_transfers')
export class InternalTransfer extends AuditBaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'from_department_id', type: 'uuid' })
  fromDepartmentId: string;

  @ManyToOne(() => Department, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'from_department_id' })
  fromDepartment: Department;

  @Column({ name: 'to_department_id', type: 'uuid' })
  toDepartmentId: string;

  @ManyToOne(() => Department, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'to_department_id' })
  toDepartment: Department;

  @Column({ name: 'quantity_kg', type: 'decimal', precision: 12, scale: 3 })
  quantityKg: string;

  @Column({
    name: 'internal_rate_per_kg',
    type: 'decimal',
    precision: 14,
    scale: 2,
  })
  internalRatePerKg: string;

  @Column({ name: 'total_amount', type: 'decimal', precision: 14, scale: 2 })
  totalAmount: string;

  @Column({
    name: 'settlement_status',
    type: 'enum',
    enum: ['unsettled', 'partially_settled', 'settled'],
    default: 'unsettled',
  })
  settlementStatus: 'unsettled' | 'partially_settled' | 'settled';

  @Column({
    name: 'amount_settled',
    type: 'decimal',
    precision: 14,
    scale: 2,
    default: 0,
  })
  amountSettled: string;

  @Column({
    name: 'remaining_balance',
    type: 'decimal',
    precision: 14,
    scale: 2,
  })
  remainingBalance: string;

  @Column({ name: 'transfer_date', type: 'date' })
  transferDate: Date;

  @Column({ name: 'vehicle_id', type: 'uuid', nullable: true })
  vehicleId?: string;

  @ManyToOne(() => Vehicle, { nullable: true })
  @JoinColumn({ name: 'vehicle_id' })
  vehicle?: Vehicle;

  @Column({ type: 'varchar', length: 255, nullable: true })
  notes?: string;

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
}
