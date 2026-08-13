import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Attachment } from './entities/attachment.entity';
import { AttachmentRepositoryInterface } from './interfaces/attachment-repository.interface';

@Injectable()
export class AttachmentRepository implements AttachmentRepositoryInterface {
  constructor(
    @InjectRepository(Attachment)
    private readonly repo: Repository<Attachment>,
  ) {}

  create(data: Partial<Attachment>) {
    return this.repo.create(data);
  }

  save(attachment: Partial<Attachment>) {
    return this.repo.save(attachment);
  }

  find(options: Parameters<Repository<Attachment>['find']>[0]) {
    return this.repo.find(options);
  }

  findOne(options: Parameters<Repository<Attachment>['findOne']>[0]) {
    return this.repo.findOne(options);
  }
}
