import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApprovalWorkflowService } from './approval-workflow.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('approvals')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ApprovalWorkflowController {
  constructor(private readonly approvalService: ApprovalWorkflowService) {}

  @Get('pending')
  @Permissions('approvals.read')
  async getPending(@Query('userId') userId?: string) {
    return this.approvalService.getPendingApprovals(userId);
  }

  @Get('history/:entityType/:entityId')
  @Permissions('approvals.read')
  async getHistory(
    @Param('entityType') entityType: string,
    @Param('entityId') entityId: string,
  ) {
    return this.approvalService.getApprovalHistory(entityType, entityId);
  }

  @Post(':id/approve')
  @Permissions('approvals.approve')
  async approve(
    @Param('id') id: string,
    @Body('notes') notes: string,
    @CurrentUser() user: any,
  ) {
    return this.approvalService.approve(id, user.id, notes);
  }

  @Post(':id/reject')
  @Permissions('approvals.reject')
  async reject(
    @Param('id') id: string,
    @Body('reason') reason: string,
    @CurrentUser() user: any,
  ) {
    return this.approvalService.reject(id, user.id, reason);
  }

  @Post(':id/delegate')
  @Permissions('approvals.manage')
  async delegate(
    @Param('id') id: string,
    @Body('newApproverUserId') newApproverUserId: string,
  ) {
    return this.approvalService.delegate(id, newApproverUserId);
  }
}
