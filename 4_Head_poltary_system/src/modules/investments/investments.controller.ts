import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { RoleEnum } from '../../common/enums/role.enum';
import { RolesGuard } from '../../common/guards/roles.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  CancelInvestmentAssignmentDto,
  CreateInvestmentAssignmentDto,
  ListInvestmentAssignmentsQueryDto,
  RecordInvestmentPaymentDto,
  UpdateInvestmentAssignmentDto,
} from './dto/investment.dto';
import { InvestmentsService } from './investments.service';

@ApiTags('Investments')
@ApiBearerAuth('JWT-auth')
@Controller('investments')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(RoleEnum.OWNER, RoleEnum.ACCOUNTANT)
export class InvestmentsController {
  constructor(private readonly service: InvestmentsService) {}

  @Get() list(@Query() query: ListInvestmentAssignmentsQueryDto) {
    return this.service.list(query);
  }
  @Get('summary') summary() {
    return this.service.summary();
  }
  @Get(':id') findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post()
  @ApiOperation({
    summary: 'Fund all or part of an unpaid farm purchase through an investor',
  })
  create(@Body() dto: CreateInvestmentAssignmentDto, @Req() req: any) {
    return this.service.create(dto, req.user.id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateInvestmentAssignmentDto,
    @Req() req: any,
  ) {
    return this.service.update(id, dto, req.user.id);
  }

  @Post(':id/payments')
  pay(
    @Param('id') id: string,
    @Body() dto: RecordInvestmentPaymentDto,
    @Req() req: any,
  ) {
    return this.service.recordPayment(id, dto, req.user.id);
  }

  @Post(':id/cancel')
  cancel(
    @Param('id') id: string,
    @Body() dto: CancelInvestmentAssignmentDto,
    @Req() req: any,
  ) {
    return this.service.cancel(id, dto.reason, req.user.id);
  }
}
