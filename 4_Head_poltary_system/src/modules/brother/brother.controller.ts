import { Body, Controller, Get, Param, Post, Query, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { RoleEnum } from '../../common/enums/role.enum';
import { BrotherService } from './brother.service';
import {
  ConfigureBrotherAccountDto,
  CreateBrotherAdjustmentDto,
  ListBrotherAdjustmentsDto,
  ListBrotherPaymentsDto,
  RecordBrotherPaymentDto,
  ReverseBrotherAdjustmentDto,
} from './dto/brother.dto';

@ApiTags('Brother Account')
@ApiBearerAuth('JWT-auth')
@Controller('brother')
@Roles(RoleEnum.OWNER, RoleEnum.ACCOUNTANT)
export class BrotherController {
  constructor(private readonly service: BrotherService) {}
  @Post('account')
  @ApiOperation({
    summary: 'Configure the separate Brother farm-adjustment account',
  })
  configure(@Body() dto: ConfigureBrotherAccountDto, @Req() req: any) {
    return this.service.configure(dto, req.user.id);
  }
  @Get('dashboard') dashboard() {
    return this.service.dashboard();
  }
  @Post('payments')
  @ApiOperation({
    summary: 'Pay any amount up to the Brother farm-adjustment balance',
  })
  pay(@Body() dto: RecordBrotherPaymentDto, @Req() req: any) {
    return this.service.recordPayment(dto, req.user.id);
  }
  @Get('payments') payments(@Query() query: ListBrotherPaymentsDto) {
    return this.service.listPayments(query.page, query.limit);
  }
  @Get('reports/farm-adjustments')
  statement(@Query() query: ListBrotherAdjustmentsDto) {
    return this.service.statement(query);
  }
  @Post('farm-adjustments')
  @ApiOperation({
    summary:
      'Transfer an explicit amount from a farm payable to the Brother medicine account',
  })
  create(@Body() dto: CreateBrotherAdjustmentDto, @Req() req: any) {
    return this.service.createAdjustment(dto, req.user.id);
  }
  @Get('farm-adjustments') list(@Query() query: ListBrotherAdjustmentsDto) {
    return this.service.list(query);
  }
  @Get('farm-adjustments/:id') findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }
  @Post('farm-adjustments/:id/reverse') reverse(
    @Param('id') id: string,
    @Body() dto: ReverseBrotherAdjustmentDto,
    @Req() req: any,
  ) {
    return this.service.reverse(id, dto, req.user.id);
  }
}
