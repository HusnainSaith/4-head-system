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
import { BrotherAccount } from './brother-account.entity';

@Entity('brother_payments')
@Index('IDX_brother_payment_account_date', ['brotherAccountId', 'paymentDate'])
export class BrotherPayment extends AuditBaseEntity {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ name: 'brother_account_id', type: 'uuid' })
  brotherAccountId: string;
  @ManyToOne(() => BrotherAccount, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'brother_account_id' })
  brotherAccount: BrotherAccount;
  @Column({ name: 'department_id', type: 'uuid' }) departmentId: string;
  @ManyToOne(() => Department, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'department_id' })
  department: Department;
  @Column({ type: 'decimal', precision: 18, scale: 2 }) amount: string;
  @Column({ name: 'balance_before', type: 'decimal', precision: 18, scale: 2 })
  balanceBefore: string;
  @Column({ name: 'balance_after', type: 'decimal', precision: 18, scale: 2 })
  balanceAfter: string;
  @Column({
    name: 'payment_method',
    type: 'enum',
    enum: ['cash', 'bank'],
    enumName: 'brother_payment_method_enum',
  })
  paymentMethod: 'cash' | 'bank';
  @Column({ name: 'cash_account_id', type: 'uuid', nullable: true })
  cashAccountId?: string;
  @Column({ name: 'bank_account_id', type: 'uuid', nullable: true })
  bankAccountId?: string;
  @Column({
    name: 'bank_transaction_method',
    type: 'enum',
    enum: ['cheque', 'app'],
    enumName: 'bank_transaction_method_enum',
    nullable: true,
  })
  bankTransactionMethod?: 'cheque' | 'app';
  @Column({ name: 'cheque_number', nullable: true }) chequeNumber?: string;
  @Column({ name: 'app_reference', nullable: true }) appReference?: string;
  @Column({ name: 'payment_date', type: 'date' }) paymentDate: string;
  @Column({ type: 'varchar', length: 100, nullable: true }) reference?: string;
  @Column({ type: 'varchar', length: 500, nullable: true }) notes?: string;
}
