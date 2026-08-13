import {
  IsString,
  IsOptional,
  IsUUID,
  IsEmail,
  IsObject,
  IsIn,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationDto } from '../../common/dto/pagination.dto';

export class CreateNotificationDto {
  @IsString() type: string;
  @IsString() title: string;
  @IsString() message: string;
  @IsOptional() @IsEmail() recipientEmail?: string;
  @IsOptional() @IsUUID() recipientUserId?: string;
  @IsString() sourceType: string;
  @IsUUID() sourceId: string;
  @IsOptional() @IsObject() context?: Record<string, unknown>;
}

export class NotificationQueryDto extends PaginationDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsIn(['pending', 'sent', 'failed'])
  status?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() sourceType?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() recipientUserId?: string;
}
