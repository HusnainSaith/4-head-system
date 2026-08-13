import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ReportsService } from './reports.service';
import { BaseController } from '../../common/controllers/base.controller';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { RoleEnum } from '../../common/enums/role.enum';

@ApiTags('Reports')
@Controller('reports')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(RoleEnum.OWNER, RoleEnum.ACCOUNTANT)
@ApiBearerAuth('JWT-auth')
export class ReportsController extends BaseController {
  constructor(private readonly reportsService: ReportsService) {
    super();
  }

  @Get('consolidated-profit-loss')
  @ApiOperation({ summary: 'Get consolidated profit and loss' })
  getConsolidatedProfitLoss(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.handleAsyncOperation(
      this.reportsService.getConsolidatedProfitLoss(
        startDate ?? from,
        endDate ?? to,
      ),
    );
  }

  @Get('department-profit-loss')
  @ApiOperation({
    summary: 'Get external revenue and gross profit by department',
  })
  getDepartmentProfitLoss(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.handleAsyncOperation(
      this.reportsService.getDepartmentProfitLoss(
        startDate ?? from,
        endDate ?? to,
      ),
    );
  }

  @Get('partner-profit-share')
  @ApiOperation({ summary: 'Get partner profit share' })
  getPartnerProfitShare(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.handleAsyncOperation(
      this.reportsService.getPartnerProfitShare(
        startDate ?? from,
        endDate ?? to,
      ),
    );
  }

  @Get('outstanding-balances')
  @ApiOperation({ summary: 'Get outstanding balances' })
  getOutstandingBalances(@Query('departmentId') departmentId?: string) {
    return this.handleAsyncOperation(
      this.reportsService.getOutstandingBalances(departmentId),
    );
  }

  @Get('stock-summary')
  @ApiOperation({ summary: 'Get stock summary' })
  getStockSummary(
    @Query('departmentId') departmentId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.handleAsyncOperation(
      this.reportsService.getStockSummary(
        departmentId,
        startDate ?? from,
        endDate ?? to,
      ),
    );
  }

  @Get('expense-breakdown')
  @ApiOperation({ summary: 'Get expense breakdown' })
  getExpenseBreakdown(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('departmentId') departmentId?: string,
    @Query('categoryId') categoryId?: string,
  ) {
    return this.handleAsyncOperation(
      this.reportsService.getExpenseBreakdown(
        startDate ?? from,
        endDate ?? to,
        departmentId,
        categoryId,
      ),
    );
  }

  @Get('payroll-summary')
  @ApiOperation({ summary: 'Get payroll summary' })
  getPayrollSummary(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('departmentId') departmentId?: string,
  ) {
    return this.handleAsyncOperation(
      this.reportsService.getPayrollSummary(
        startDate ?? from,
        endDate ?? to,
        departmentId,
      ),
    );
  }
}
