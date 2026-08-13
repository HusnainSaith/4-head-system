import {
  Column,
  Entity,
  Index,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { AuditBaseEntity } from '../../../common/entities/audit-base.entity';
import { Party } from '../../parties/entities/party.entity';

export enum InvestorType {
  STANDARD = 'standard',
  BROTHER = 'brother',
}
export enum InvestorStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
}

@Entity('investors')
@Index('IDX_investor_status', ['status'])
@Unique('UQ_investor_party', ['partyId'])
export class Investor extends AuditBaseEntity {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ name: 'party_id', type: 'uuid' }) partyId: string;
  @OneToOne(() => Party, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'party_id' })
  party: Party;
  @Column({
    name: 'investor_type',
    type: 'enum',
    enum: InvestorType,
    enumName: 'investor_type_enum',
    default: InvestorType.STANDARD,
  })
  investorType: InvestorType;
  @Column({
    name: 'profit_share_percentage',
    type: 'decimal',
    precision: 7,
    scale: 4,
  })
  profitSharePercentage: string;
  @Column({
    type: 'enum',
    enum: InvestorStatus,
    enumName: 'investor_status_enum',
    default: InvestorStatus.ACTIVE,
  })
  status: InvestorStatus;
  @Column({ type: 'varchar', length: 500, nullable: true }) notes?: string;
}
