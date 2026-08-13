import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';
import { AuditBaseEntity } from '../../../common/entities/audit-base.entity';
import {
  PartyPaymentDirection,
  PartyPaymentMethod,
} from '../dto/record-party-payment.dto';

@Entity('party_payments')
@Index(['partyId', 'paymentDate'])
export class PartyPayment extends AuditBaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'party_id', type: 'uuid' })
  partyId: string;

  @Column({ name: 'department_id', type: 'uuid' })
  departmentId: string;

  @Column({ type: 'decimal', precision: 14, scale: 2 })
  amount: string;

  @Column({ type: 'enum', enum: PartyPaymentDirection })
  direction: PartyPaymentDirection;

  @Column({ name: 'payment_method', type: 'enum', enum: PartyPaymentMethod })
  paymentMethod: PartyPaymentMethod;

  @Column({ name: 'payment_date', type: 'date' })
  paymentDate: string;

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
