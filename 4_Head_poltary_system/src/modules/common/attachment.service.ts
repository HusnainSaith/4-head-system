import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Inject,
} from '@nestjs/common';
import { IsNull } from 'typeorm';
import { Attachment } from './entities/attachment.entity';
import * as fs from 'fs';
import * as path from 'path';
import {
  AttachmentRepositoryInterface,
  ATTACHMENT_REPOSITORY,
} from './interfaces/attachment-repository.interface';

@Injectable()
export class AttachmentService {
  private readonly uploadDir = path.resolve(
    process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads'),
  );

  constructor(
    @Inject(ATTACHMENT_REPOSITORY)
    private readonly attachmentRepo: AttachmentRepositoryInterface,
  ) {
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  async upload(
    file: any,
    parentType: string,
    parentId: string,
    uploadedBy: string,
    documentType: string,
    description?: string,
  ): Promise<Attachment> {
    if (!file) throw new BadRequestException('No file provided');

    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      throw new BadRequestException('File size exceeds 10MB limit');
    }

    const fileName = `${Date.now()}_${file.originalname}`;
    const filePath = path.join(this.uploadDir, fileName);
    fs.writeFileSync(filePath, file.buffer);

    const attachment = this.attachmentRepo.create({
      parentType,
      parentId,
      fileName: file.originalname,
      fileUrl: `/uploads/${fileName}`,
      mimeType: file.mimetype,
      fileSize: file.size,
      uploadedBy,
      description,
      documentType: documentType as any,
    });

    return this.attachmentRepo.save(attachment);
  }

  async findByParent(
    parentType: string,
    parentId: string,
  ): Promise<Attachment[]> {
    return this.attachmentRepo.find({
      where: { parentType, parentId, deletedAt: IsNull() },
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string): Promise<Attachment> {
    const attachment = await this.attachmentRepo.findOne({
      where: { id, deletedAt: IsNull() },
    });
    if (!attachment) throw new NotFoundException('Attachment not found');
    return attachment;
  }

  async getFileStream(
    id: string,
  ): Promise<{ stream: fs.ReadStream; attachment: Attachment }> {
    const attachment = await this.findOne(id);
    const fileName = path.basename(attachment.fileUrl);
    const filePath = path.join(this.uploadDir, fileName);

    if (!fs.existsSync(filePath)) {
      throw new NotFoundException('File not found on disk');
    }

    const stream = fs.createReadStream(filePath);
    return { stream, attachment };
  }

  async remove(id: string): Promise<void> {
    const attachment = await this.findOne(id);
    attachment.deletedAt = new Date();
    await this.attachmentRepo.save(attachment);
  }

  async getStatistics(parentType?: string): Promise<any> {
    const where: any = { deletedAt: IsNull() };
    if (parentType) where.parentType = parentType;

    const attachments = await this.attachmentRepo.find({ where });

    return {
      totalCount: attachments.length,
      totalSize: attachments.reduce(
        (sum, a) => sum + Number(a.fileSize || 0),
        0,
      ),
      byType: attachments.reduce((acc, a) => {
        acc[a.documentType] = (acc[a.documentType] || 0) + 1;
        return acc;
      }, {}),
      byParentType: attachments.reduce((acc, a) => {
        acc[a.parentType] = (acc[a.parentType] || 0) + 1;
        return acc;
      }, {}),
    };
  }
}
