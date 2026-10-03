import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity('department_partner_shares')
export class DepartmentPartnerShare {
  @Column('boolean', { name: 'equal_share', default: false })
  equalShare: boolean;
  @PrimaryColumn('uuid', { name: 'department_id' }) departmentId: string;
  @PrimaryColumn('uuid', { name: 'user_id' }) userId: string;
  @Column('uuid', { name: 'party_id', unique: true }) partyId: string;
  @Column('decimal', { precision: 7, scale: 4 }) percentage: string;
  @Column('uuid', { name: 'updated_by' }) updatedBy: string;
  @Column('timestamptz', { name: 'updated_at' }) updatedAt: Date;
}
