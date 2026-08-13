import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Body,
  Res,
  StreamableFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { AttachmentService } from './attachment.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('attachments')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class AttachmentController {
  constructor(private readonly attachmentService: AttachmentService) {}

  @Post('upload')
  @Permissions('attachments.create')
  @UseInterceptors(FileInterceptor('file'))
  async upload(
    @UploadedFile() file: any,
    @Body('parentType') parentType: string,
    @Body('parentId') parentId: string,
    @Body('documentType') documentType: string,
    @Body('description') description: string,
    @CurrentUser() user: any,
  ) {
    return this.attachmentService.upload(
      file,
      parentType,
      parentId,
      user.id,
      documentType,
      description,
    );
  }

  @Get(':parentType/:parentId')
  @Permissions('attachments.read')
  async findByParent(
    @Param('parentType') parentType: string,
    @Param('parentId') parentId: string,
  ) {
    return this.attachmentService.findByParent(parentType, parentId);
  }

  @Get(':id/download')
  @Permissions('attachments.read')
  async download(
    @Param('id') id: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { stream, attachment } =
      await this.attachmentService.getFileStream(id);

    res.set({
      'Content-Type': attachment.mimeType,
      'Content-Disposition': `attachment; filename="${attachment.fileName}"`,
    });

    return new StreamableFile(stream);
  }

  @Delete(':id')
  @Permissions('attachments.delete')
  async remove(@Param('id') id: string) {
    await this.attachmentService.remove(id);
    return { message: 'Attachment deleted successfully' };
  }

  @Get('statistics')
  @Permissions('attachments.read')
  async getStatistics(@Query('parentType') parentType?: string) {
    return this.attachmentService.getStatistics(parentType);
  }
}
