import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SettlementsService } from './settlements.service';
import { BaseController } from '../../common/controllers/base.controller';

@ApiTags('Settlements')
@Controller('settlements')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class SettlementsController extends BaseController {
  constructor(private readonly settlementsService: SettlementsService) {
    super();
  }

  @Get('purchases/outstanding')
  @ApiOperation({ summary: 'Get outstanding purchase settlements' })
  getOutstandingPurchases() {
    return this.handleAsyncOperation(
      this.settlementsService.getOutstandingPurchases(),
    );
  }

  @Get('sales/outstanding')
  @ApiOperation({ summary: 'Get outstanding sales settlements' })
  getOutstandingSales() {
    return this.handleAsyncOperation(
      this.settlementsService.getOutstandingSales(),
    );
  }

  @Get('summary/:partyId')
  @ApiOperation({ summary: 'Get settlement summary for a party' })
  getSettlementSummary(
    @Param('partyId') partyId: string,
    @Query('partyType') partyType?: string,
  ) {
    return this.handleAsyncOperation(
      this.settlementsService.getSettlementSummary(partyId, partyType),
    );
  }

  @Post('payments')
  @ApiOperation({ summary: 'Record a new payment' })
  createPayment(@Body() dto: any) {
    return this.handleAsyncOperation(
      this.settlementsService.createPayment(dto),
    );
  }

  @Post('payments/:id/post')
  @ApiOperation({ summary: 'Post a payment' })
  postPayment(@Param('id') id: string) {
    return this.handleAsyncOperation(this.settlementsService.postPayment(id));
  }

  @Post('payments/:id/clear')
  @ApiOperation({ summary: 'Clear a posted payment' })
  clearPayment(@Param('id') id: string) {
    return this.handleAsyncOperation(this.settlementsService.clearPayment(id));
  }
}
