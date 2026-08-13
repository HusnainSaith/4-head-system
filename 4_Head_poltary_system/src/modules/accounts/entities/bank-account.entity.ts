import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { AuditBaseEntity } from '../../../common/entities/audit-base.entity';

@Entity('bank_accounts')
export class BankAccount extends AuditBaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'bank_name' })
  bankName: string;

  @Column({ name: 'account_title' })
  accountTitle: string;

  @Column({ name: 'account_number', nullable: true })
  accountNumber?: string;

  @Column({ name: 'branch_name', nullable: true })
  branchName?: string;

  @Column({
    name: 'opening_balance',
    type: 'decimal',
    precision: 14,
    scale: 2,
    default: 0,
  })
  openingBalance: string;

  @Column({ name: 'opening_balance_date', type: 'date', nullable: true })
  openingBalanceDate?: Date;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;
}
