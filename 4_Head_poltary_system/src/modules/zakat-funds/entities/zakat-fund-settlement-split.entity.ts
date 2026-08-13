import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Party } from '../../parties/entities/party.entity';
import { ZakatFundSettlement } from './zakat-fund-settlement.entity';

@Entity('zakat_fund_settlement_splits')
export class ZakatFundSettlementSplit {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ name: 'settlement_id', type: 'uuid' }) settlementId: string;
  @ManyToOne(() => ZakatFundSettlement, (settlement) => settlement.splits, {
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'settlement_id' })
  settlement: ZakatFundSettlement;
  @Column({ name: 'party_id', type: 'uuid' }) partyId: string;
  @ManyToOne(() => Party, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'party_id' })
  party: Party;
  @Column({ type: 'decimal', precision: 18, scale: 2 }) amount: string;
  @Column({ type: 'decimal', precision: 7, scale: 4, nullable: true })
  percentage?: string;
}
