import {
  Controller,
  Delete,
  Get,
  Post,
  Param,
  Query,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { RoleEnum } from '../../common/enums/role.enum';
import { NotificationsService } from './notifications.service';
import { NotificationQueryDto } from './notification.dto';

@ApiTags('Notifications')
@Controller('notifications')
@ApiBearerAuth('JWT-auth')
export class NotificationsController {
  constructor(private readonly service: NotificationsService) {}

  @Get()
  @Roles(RoleEnum.OWNER, RoleEnum.ACCOUNTANT)
  @ApiOperation({ summary: 'List notifications' })
  findAll(@Query() query: NotificationQueryDto) {
    return this.service.findAll(query);
  }

  @Get(':id')
  @Roles(RoleEnum.OWNER, RoleEnum.ACCOUNTANT)
  @ApiOperation({ summary: 'Get notification by ID' })
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post(':id/retry')
  @Roles(RoleEnum.OWNER, RoleEnum.ACCOUNTANT)
  @ApiOperation({ summary: 'Retry a failed notification' })
  retry(@Param('id') id: string) {
    return this.service.retry(id);
  }

  @Post(':id/resend')
  @Roles(RoleEnum.OWNER, RoleEnum.ACCOUNTANT)
  @ApiOperation({ summary: 'Resend a notification' })
  resend(@Param('id') id: string) {
    return this.service.resend(id);
  }

  @Delete(':id')
  @Roles(RoleEnum.OWNER)
  @ApiOperation({ summary: 'Soft-delete a notification' })
  remove(@Param('id') id: string, @Req() req: Request) {
    return this.service.remove(id, (req as any).user.id);
  }
}
