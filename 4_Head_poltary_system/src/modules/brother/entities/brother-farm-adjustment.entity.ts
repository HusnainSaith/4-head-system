import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { AuditBaseEntity } from '../../../common/entities/audit-base.entity';
import { Department } from '../../departments/entities/department.entity';
import { Party } from '../../parties/entities/party.entity';
import { BrotherAccount } from './brother-account.entity';

export enum BrotherAdjustmentType {
  FARM_ADJUSTMENT = 'farm_adjustment',
  REVERSAL = 'reversal',
}
export enum BrotherAdjustmentStatus {
  ACTIVE = 'active',
  REVERSED = 'reversed',
}

@Entity('brother_farm_adjustments')
@Index('IDX_brother_adjustment_farm_date', ['farmPartyId', 'transactionDate'])
@Index('IDX_brother_adjustment_account_date', [
  'brotherAccountId',
  'transactionDate',
])
@Index('IDX_brother_adjustment_status', ['status'])
export class BrotherFarmAdjustment extends AuditBaseEntity {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ name: 'brother_account_id', type: 'uuid' })
  brotherAccountId: string;
  @ManyToOne(() => BrotherAccount, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'brother_account_id' })
  brotherAccount: BrotherAccount;
  @Column({ name: 'farm_party_id', type: 'uuid' }) farmPartyId: string;
  @ManyToOne(() => Party, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'farm_party_id' })
  farmParty: Party;
  @Column({ name: 'department_id', type: 'uuid' }) departmentId: string;
  @ManyToOne(() => Department, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'department_id' })
  department: Department;
  @Column({
    name: 'transaction_type',
    type: 'enum',
    enum: BrotherAdjustmentType,
    enumName: 'brother_adjustment_type_enum',
  })
  transactionType: BrotherAdjustmentType;
  @Column({ type: 'decimal', precision: 18, scale: 2 }) amount: string;
  @Column({
    name: 'brother_balance_before',
    type: 'decimal',
    precision: 18,
    scale: 2,
  })
  brotherBalanceBefore: string;
  @Column({
    name: 'brother_balance_after',
    type: 'decimal',
    precision: 18,
    scale: 2,
  })
  brotherBalanceAfter: string;
  @Column({
    name: 'farm_balance_before',
    type: 'decimal',
    precision: 18,
    scale: 2,
  })
  farmBalanceBefore: string;
  @Column({
    name: 'farm_balance_after',
    type: 'decimal',
    precision: 18,
    scale: 2,
  })
  farmBalanceAfter: string;
  @Column({ name: 'transaction_date', type: 'date' }) transactionDate: string;
  @Column({ type: 'varchar', length: 100, nullable: true }) reference?: string;
  @Column({ type: 'varchar', length: 500, nullable: true }) notes?: string;
  @Column({
    type: 'enum',
    enum: BrotherAdjustmentStatus,
    enumName: 'brother_adjustment_status_enum',
    default: BrotherAdjustmentStatus.ACTIVE,
  })
  status: BrotherAdjustmentStatus;
  @Column({ name: 'original_transaction_id', type: 'uuid', nullable: true })
  originalTransactionId?: string;
  @ManyToOne(() => BrotherFarmAdjustment, {
    nullable: true,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'original_transaction_id' })
  originalTransaction?: BrotherFarmAdjustment;
  @Column({ name: 'reversal_transaction_id', type: 'uuid', nullable: true })
  reversalTransactionId?: string;
  @Column({
    name: 'reversal_reason',
    type: 'varchar',
    length: 500,
    nullable: true,
  })
  reversalReason?: string;
  @Column({ name: 'reversed_at', type: 'timestamptz', nullable: true })
  reversedAt?: Date;
  @Column({ name: 'reversed_by', type: 'uuid', nullable: true })
  reversedBy?: string;
}
