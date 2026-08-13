import {
  Column,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { AuditBaseEntity } from '../../../common/entities/audit-base.entity';
import { Party } from '../../parties/entities/party.entity';

@Entity('brother_accounts')
@Unique('UQ_brother_account_party', ['partyId'])
export class BrotherAccount extends AuditBaseEntity {
  @PrimaryGeneratedColumn('uuid') id: string;

  @Column({ name: 'party_id', type: 'uuid' }) partyId: string;
  @OneToOne(() => Party, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'party_id' })
  party: Party;

  @Column({ type: 'boolean', name: 'is_active', default: true })
  isActive: boolean;
}
