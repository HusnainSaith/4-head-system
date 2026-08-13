import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
} from 'typeorm';

@Entity('departments')
export class Department {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 100, unique: true })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({
    type: 'enum',
    enum: ['BROKERAGE', 'SUPPLY', 'WASTAGE', 'FRESH_CHICKEN_SHOP'],
  })
  type: 'BROKERAGE' | 'SUPPLY' | 'WASTAGE' | 'FRESH_CHICKEN_SHOP';

  @Column({ length: 100, nullable: true, name: 'head_name' })
  headName: string;

  @Column({ length: 50, nullable: true, name: 'cost_center' })
  costCenter: string;

  @Column({ type: 'boolean', default: true, name: 'is_active' })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deletedAt: Date;
}
