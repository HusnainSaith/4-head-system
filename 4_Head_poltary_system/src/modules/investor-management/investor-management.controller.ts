import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { RoleEnum } from '../../common/enums/role.enum';
import {
  CalculateProfitPeriodDto,
  CreateInvestorDto,
  DistributeInvestorProfitDto,
  ListInvestorsDto,
  ListProfitPeriodsDto,
  RecordCapitalTransactionDto,
  RecordInvestorAccountTransactionDto,
  UpdateInvestorDto,
} from './dto/investor.dto';
import { InvestorManagementService } from './investor-management.service';

@ApiTags('Investor Management')
@ApiBearerAuth('JWT-auth')
@Controller('investors')
@Roles(RoleEnum.OWNER, RoleEnum.ACCOUNTANT)
export class InvestorManagementController {
  constructor(private readonly service: InvestorManagementService) {}
  @Get('dashboard') globalDashboard() {
    return this.service.globalDashboard();
  }
  @Get('reports/capital') capitalReport() {
    return this.service.capitalReport();
  }
  @Get('reports/profits') profitReport() {
    return this.service.profitReport();
  }
  @Post() create(@Body() dto: CreateInvestorDto, @Req() req: any) {
    return this.service.create(dto, req.user.id);
  }
  @Get() list(@Query() query: ListInvestorsDto) {
    return this.service.list(query);
  }
  @Get(':id') findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }
  @Patch(':id') update(
    @Param('id') id: string,
    @Body() dto: UpdateInvestorDto,
    @Req() req: any,
  ) {
    return this.service.update(id, dto, req.user.id);
  }
  @Post(':id/investments')
  @ApiOperation({
    summary:
      'Record investor capital received into a department cash or bank account',
  })
  invest(
    @Param('id') id: string,
    @Body() dto: RecordCapitalTransactionDto,
    @Req() req: any,
  ) {
    return this.service.recordInvestment(id, dto, req.user.id);
  }
  @Post(':id/withdrawals') withdraw(
    @Param('id') id: string,
    @Body() dto: RecordCapitalTransactionDto,
    @Req() req: any,
  ) {
    return this.service.recordWithdrawal(id, dto, req.user.id);
  }
  @Get(':id/ledger') ledger(@Param('id') id: string) {
    return this.service.ledgerForInvestor(id);
  }
  @Post(':id/transactions')
  @ApiOperation({
    summary:
      'Record a deposit, withdrawal, manual profit/loss, or Brother farm transfer',
  })
  transaction(
    @Param('id') id: string,
    @Body() dto: RecordInvestorAccountTransactionDto,
    @Req() req: any,
  ) {
    return this.service.recordAccountTransaction(id, dto, req.user.id);
  }
  @Get(':id/profit-history') history(@Param('id') id: string) {
    return this.service.profitHistory(id);
  }
  @Get(':id/dashboard') dashboard(@Param('id') id: string) {
    return this.service.investorDashboard(id);
  }
  @Post(':id/profit-distributions') distribute(
    @Param('id') id: string,
    @Body() dto: DistributeInvestorProfitDto,
    @Req() req: any,
  ) {
    return this.service.distributeProfit(id, dto, req.user.id);
  }
}

@ApiTags('Investor Profit Periods')
@ApiBearerAuth('JWT-auth')
@Controller('investor-profit-periods')
@Roles(RoleEnum.OWNER, RoleEnum.ACCOUNTANT)
export class InvestorProfitPeriodsController {
  constructor(private readonly service: InvestorManagementService) {}
  @Post('calculate') calculate(
    @Body() dto: CalculateProfitPeriodDto,
    @Req() req: any,
  ) {
    return this.service.calculatePeriod(dto, req.user.id);
  }
  @Get() list(@Query() query: ListProfitPeriodsDto) {
    return this.service.listPeriods(query);
  }
  @Get(':id') findOne(@Param('id') id: string) {
    return this.service.findPeriod(id);
  }
  @Post(':id/finalize') finalize(@Param('id') id: string, @Req() req: any) {
    return this.service.finalizePeriod(id, req.user.id);
  }
}
