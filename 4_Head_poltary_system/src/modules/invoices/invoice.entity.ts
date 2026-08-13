import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { AuditBaseEntity } from '../../common/entities/audit-base.entity';
import { Department } from '../departments/entities/department.entity';
import { Party } from '../parties/entities/party.entity';

export const invoiceTypes = [
  'purchase',
  'sale',
  'transfer',
  'payment',
  'salary',
  'expense',
  'writeoff',
] as const;
export type InvoiceType = (typeof invoiceTypes)[number];
export type InvoiceStatus = 'draft' | 'posted' | 'cancelled';

export interface InvoiceLineItem {
  description: string;
  qty: number;
  unit: string;
  rate: number;
  amount: number;
}

@Entity('invoices')
@Index(['sourceType', 'sourceId'], { unique: true })
@Index(['departmentId'])
@Index(['invoiceNumber'], { unique: true })
export class Invoice extends AuditBaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'invoice_number', length: 32, unique: true })
  invoiceNumber: string;

  @Column({ name: 'invoice_type', type: 'enum', enum: invoiceTypes })
  invoiceType: InvoiceType;

  @Column({ name: 'department_id', type: 'uuid' })
  departmentId: string;

  @ManyToOne(() => Department)
  @JoinColumn({ name: 'department_id' })
  department: Department;

  @Column({ name: 'source_type', length: 50 })
  sourceType: string;

  @Column({ name: 'source_id', type: 'uuid' })
  sourceId: string;

  @Column({ name: 'party_id', type: 'uuid', nullable: true })
  partyId?: string;

  @ManyToOne(() => Party, { nullable: true })
  @JoinColumn({ name: 'party_id' })
  party?: Party;

  @Column({ name: 'party_name', length: 150, nullable: true })
  partyName?: string;

  @Column({ name: 'line_items', type: 'jsonb' })
  lineItems: InvoiceLineItem[];

  @Column({ type: 'decimal', precision: 14, scale: 2 })
  subtotal: string;

  @Column({
    name: 'tax_amount',
    type: 'decimal',
    precision: 14,
    scale: 2,
    default: 0,
  })
  taxAmount: string;

  @Column({ name: 'total_amount', type: 'decimal', precision: 14, scale: 2 })
  totalAmount: string;

  @Column({ type: 'text', nullable: true })
  notes?: string;

  @Column({
    type: 'enum',
    enum: ['draft', 'posted', 'cancelled'],
    default: 'posted',
  })
  status: InvoiceStatus;

  @Column({ name: 'issued_at', type: 'timestamptz' })
  issuedAt: Date;
}
