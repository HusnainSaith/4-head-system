import { Body, Controller, Get, Param, Post, Query, Req } from '@nestjs/common';
import { Roles } from '../../common/decorators/roles.decorator';
import { RoleEnum } from '../../common/enums/role.enum';
import {
  ListZakatFundsDto,
  RecordZakatFundPaymentDto,
  ReverseZakatFundDto,
  SettleZakatFundDto,
} from './dto/zakat-fund.dto';
import { ZakatFundsService } from './zakat-funds.service';

@Controller('zakat-funds')
@Roles(RoleEnum.OWNER, RoleEnum.ACCOUNTANT)
export class ZakatFundsController {
  constructor(private readonly service: ZakatFundsService) {}
  @Get('dashboard') dashboard(@Query() query: ListZakatFundsDto) {
    return this.service.dashboard(query);
  }
  @Get('payments') payments(@Query() query: ListZakatFundsDto) {
    return this.service.listPayments(query);
  }
  @Post('payments') payment(
    @Body() dto: RecordZakatFundPaymentDto,
    @Req() req: any,
  ) {
    return this.service.recordPayment(dto, req.user.id);
  }
  @Post('payments/:id/reverse') reversePayment(
    @Param('id') id: string,
    @Body() dto: ReverseZakatFundDto,
    @Req() req: any,
  ) {
    return this.service.reversePayment(id, dto, req.user.id);
  }
  @Get('settlements') settlements(@Query() query: ListZakatFundsDto) {
    return this.service.listSettlements(query);
  }
  @Post('settlements') settlement(
    @Body() dto: SettleZakatFundDto,
    @Req() req: any,
  ) {
    return this.service.settle(dto, req.user.id);
  }
  @Post('settlements/:id/reverse') reverseSettlement(
    @Param('id') id: string,
    @Body() dto: ReverseZakatFundDto,
    @Req() req: any,
  ) {
    return this.service.reverseSettlement(id, dto, req.user.id);
  }
}
