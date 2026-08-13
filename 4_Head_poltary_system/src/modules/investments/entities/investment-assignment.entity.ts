import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { AuditBaseEntity } from '../../../common/entities/audit-base.entity';
import { BrokeragePurchase } from '../../brokerage/entities/brokerage-purchase.entity';
import { Department } from '../../departments/entities/department.entity';
import { Party } from '../../parties/entities/party.entity';
import { InvestmentPayment } from './investment-payment.entity';

export enum InvestmentAssignmentType {
  FARM_SETTLEMENT = 'farm_settlement',
  INVESTMENT = 'investment',
}

export enum InvestmentOutcome {
  PROFIT = 'profit',
  LOSS = 'loss',
}

export enum InvestmentAssignmentStatus {
  ACTIVE = 'active',
  SETTLED = 'settled',
  CANCELLED = 'cancelled',
}

@Entity('investment_assignments')
@Index(['purchaseId'])
@Index(['investorPartyId', 'status'])
export class InvestmentAssignment extends AuditBaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'department_id', type: 'uuid' })
  departmentId: string;

  @ManyToOne(() => Department, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'department_id' })
  department: Department;

  @Column({ name: 'purchase_id', type: 'uuid' })
  purchaseId: string;

  @ManyToOne(() => BrokeragePurchase, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'purchase_id' })
  purchase: BrokeragePurchase;

  @Column({ name: 'farm_party_id', type: 'uuid' })
  farmPartyId: string;

  @ManyToOne(() => Party, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'farm_party_id' })
  farmParty: Party;

  @Column({ name: 'investor_party_id', type: 'uuid' })
  investorPartyId: string;

  @ManyToOne(() => Party, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'investor_party_id' })
  investorParty: Party;

  @Column({
    name: 'assignment_type',
    type: 'enum',
    enum: InvestmentAssignmentType,
  })
  assignmentType: InvestmentAssignmentType;

  @Column({
    type: 'enum',
    enum: InvestmentOutcome,
    default: InvestmentOutcome.PROFIT,
  })
  outcome: InvestmentOutcome;

  @Column({
    name: 'principal_amount',
    type: 'decimal',
    precision: 14,
    scale: 2,
  })
  principalAmount: string;

  @Column({ name: 'return_rate', type: 'decimal', precision: 7, scale: 4 })
  returnRate: string;

  @Column({ name: 'return_amount', type: 'decimal', precision: 14, scale: 2 })
  returnAmount: string;

  @Column({ name: 'total_payable', type: 'decimal', precision: 14, scale: 2 })
  totalPayable: string;

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
  })
  outstandingAmount: string;

  @Column({ name: 'assignment_date', type: 'date' })
  assignmentDate: string;

  @Column({
    name: 'external_reference',
    type: 'varchar',
    length: 100,
    nullable: true,
  })
  externalReference?: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  notes?: string;

  @Column({
    type: 'enum',
    enum: InvestmentAssignmentStatus,
    default: InvestmentAssignmentStatus.ACTIVE,
  })
  status: InvestmentAssignmentStatus;

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

  @OneToMany(() => InvestmentPayment, (payment) => payment.assignment)
  payments: InvestmentPayment[];
}
