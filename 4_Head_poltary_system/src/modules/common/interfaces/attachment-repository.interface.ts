import { FindManyOptions, FindOneOptions } from 'typeorm';
import { Attachment } from '../entities/attachment.entity';

export const ATTACHMENT_REPOSITORY = 'ATTACHMENT_REPOSITORY';

export interface AttachmentRepositoryInterface {
  create(data: Partial<Attachment>): Attachment;
  save(attachment: Partial<Attachment>): Promise<Attachment> | Promise<any>;
  find(options?: FindManyOptions<Attachment>): Promise<Attachment[]>;
  findOne(options: FindOneOptions<Attachment>): Promise<Attachment | null>;
}
