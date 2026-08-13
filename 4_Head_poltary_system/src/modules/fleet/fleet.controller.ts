import { Controller, Get, Query, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { FleetService } from './fleet.service';
import { BaseController } from '../../common/controllers/base.controller';

@ApiTags('Fleet')
@Controller('fleet')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class FleetController extends BaseController {
  constructor(private readonly fleetService: FleetService) {
    super();
  }

  @Get('dashboard')
  @ApiOperation({ summary: 'Get fleet performance dashboard' })
  getDashboard(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.handleAsyncOperation(
      this.fleetService.getDashboard(startDate, endDate),
    );
  }

  @Get('maintenance/due')
  @ApiOperation({ summary: 'Get vehicles due for maintenance' })
  getMaintenanceDue(@Query('daysAhead') daysAhead = '30') {
    return this.handleAsyncOperation(
      this.fleetService.getMaintenanceDue(Number(daysAhead)),
    );
  }

  @Get('vehicles/:id/history')
  @ApiOperation({ summary: 'Get vehicle history' })
  getVehicleHistory(@Param('id') id: string) {
    return this.handleAsyncOperation(this.fleetService.getVehicleHistory(id));
  }

  @Get('vehicles/:id/utilization')
  @ApiOperation({ summary: 'Get vehicle utilization' })
  getVehicleUtilization(
    @Param('id') id: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.handleAsyncOperation(
      this.fleetService.getVehicleUtilization(id, startDate, endDate),
    );
  }
}
