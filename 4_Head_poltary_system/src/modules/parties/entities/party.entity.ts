import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  ManyToMany,
  JoinTable,
} from 'typeorm';
import { AuditBaseEntity } from '../../../common/entities/audit-base.entity';
import { Department } from '../../departments/entities/department.entity';
import { PartyTypeEnum } from '../../../common/types/party-type.enum';
import { User } from '../../users/entities/user.entity';

@Entity('parties')
export class Party extends AuditBaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'uuid', nullable: true })
  userId?: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'user_id' })
  user?: User;

  @Column({ type: 'enum', enum: PartyTypeEnum, name: 'party_type' })
  partyType: PartyTypeEnum;

  @Column({ length: 150 })
  name: string;

  @Column({ length: 30, nullable: true })
  phone?: string;

  @Column({ length: 255, nullable: true })
  address?: string;

  /**
   * Internal department represented by this party. Used only when a business
   * department must act as a ledger counterparty (for example the Shop side of
   * a Supply internal transfer). It is not the department that manages an
   * ordinary external party.
   */
  @Column({ name: 'linked_department_id', type: 'uuid', nullable: true })
  linkedDepartmentId?: string;

  @ManyToOne(() => Department, { nullable: true })
  @JoinColumn({ name: 'linked_department_id' })
  linkedDepartment?: Department;

  /** Department responsible for managing this external party relationship. */
  @Column({ name: 'primary_department_id', type: 'uuid', nullable: true })
  primaryDepartmentId?: string;

  @ManyToOne(() => Department, { nullable: true })
  @JoinColumn({ name: 'primary_department_id' })
  primaryDepartment?: Department;

  @ManyToMany(() => Department)
  @JoinTable({
    name: 'party_departments',
    joinColumn: { name: 'party_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'department_id', referencedColumnName: 'id' },
  })
  departments: Department[];

  @Column({
    name: 'opening_balance',
    type: 'decimal',
    precision: 14,
    scale: 2,
    default: 0,
  })
  openingBalance: string;

  @Column({ type: 'text', nullable: true })
  notes?: string;
}
