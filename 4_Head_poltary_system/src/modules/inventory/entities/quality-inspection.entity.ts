import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { Batch } from './batch.entity';
import { User } from '../../users/entities/user.entity';

@Entity('quality_inspections')
export class QualityInspection {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'batch_id' })
  batchId: string;

  @ManyToOne(() => Batch, (batch) => batch.qualityInspections)
  @JoinColumn({ name: 'batch_id' })
  batch: Batch;

  @Column({ name: 'inspector_user_id' })
  inspectorUserId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'inspector_user_id' })
  inspector: User;

  @Column({
    type: 'enum',
    enum: ['PASSED', 'FAILED', 'CONDITIONAL'],
  })
  status: 'PASSED' | 'FAILED' | 'CONDITIONAL';

  @Column({ nullable: true })
  remarks: string;

  @Column({
    name: 'temperature_reading',
    type: 'decimal',
    precision: 5,
    scale: 2,
    nullable: true,
  })
  temperatureReading?: string;

  @Column({ name: 'quality_grade', length: 20, nullable: true })
  qualityGrade?: string;

  @CreateDateColumn()
  inspectedAt: Date;
}
