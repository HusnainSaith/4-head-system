import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('attachments')
export class Attachment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  parentType: string; // PURCHASE, SALE, EXPENSE, INVOICE, etc.

  @Column()
  parentId: string; // ID of the parent document

  @Column()
  fileName: string;

  @Column()
  fileUrl: string; // S3 or cloud storage URL

  @Column({ nullable: true })
  mimeType: string; // application/pdf, image/jpeg, etc.

  @Column({ type: 'bigint', nullable: true })
  fileSize: number; // In bytes

  @Column({ nullable: true })
  uploadedBy: string; // User ID

  @Column({ nullable: true })
  description: string;

  @Column({
    type: 'enum',
    enum: ['INVOICE', 'RECEIPT', 'VOUCHER', 'PROOF', 'NOTE', 'OTHER'],
  })
  documentType: 'INVOICE' | 'RECEIPT' | 'VOUCHER' | 'PROOF' | 'NOTE' | 'OTHER';

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ nullable: true })
  deletedAt: Date;
}
