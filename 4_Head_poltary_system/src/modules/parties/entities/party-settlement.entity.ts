import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { AuditBaseEntity } from '../../../common/entities/audit-base.entity';
import { Party } from './party.entity';
import { Department } from '../../departments/entities/department.entity';

/**
 * Party Settlement Entity
 *
 * Represents a transaction where a payable party and a receivable party
 * are settled against each other without involving Cash or Bank accounts.
 *
 * Example:
 * - payablePartyId: Party A (we owe Rs. 10,000)
 * - receivablePartyId: Party B (they owe us Rs. 10,000)
 * - settlementAmount: Rs. 10,000
 *
 * After settlement:
 * - Party A balance: 0 (was +10,000, reduced by 10,000)
 * - Party B balance: 0 (was -10,000, increased by 10,000)
 * - Cash/Bank: unchanged
 */
@Entity('party_settlements')
@Index(['payablePartyId', 'receivablePartyId'])
@Index(['departmentId', 'settlementDate'])
@Index(['payablePartyId', 'departmentId'])
@Index(['receivablePartyId', 'departmentId'])
export class PartySettlement extends AuditBaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'payable_party_id', type: 'uuid' })
  payablePartyId: string;

  @ManyToOne(() => Party, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'payable_party_id' })
  payableParty: Party;

  @Column({ name: 'receivable_party_id', type: 'uuid' })
  receivablePartyId: string;

  @ManyToOne(() => Party, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'receivable_party_id' })
  receivableParty: Party;

  @Column({ name: 'department_id', type: 'uuid' })
  departmentId: string;

  @ManyToOne(() => Department, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'department_id' })
  department: Department;

  @Column({
    name: 'settlement_amount',
    type: 'decimal',
    precision: 14,
    scale: 2,
  })
  settlementAmount: string;

  @Column({ name: 'settlement_date', type: 'date' })
  settlementDate: string;

  @Column({ name: 'reference', type: 'varchar', length: 255, nullable: true })
  reference?: string;

  @Column({ name: 'notes', type: 'varchar', length: 500, nullable: true })
  notes?: string;

  @Column({
    name: 'status',
    type: 'enum',
    enum: ['active', 'reversed'],
    default: 'active',
  })
  status: 'active' | 'reversed';

  @Column({
    name: 'reversed_at',
    type: 'timestamptz',
    nullable: true,
  })
  reversedAt?: Date;

  @Column({
    name: 'reversed_by',
    type: 'uuid',
    nullable: true,
  })
  reversedBy?: string;

  @Column({
    name: 'reversal_reason',
    type: 'varchar',
    length: 500,
    nullable: true,
  })
  reversalReason?: string;
}
