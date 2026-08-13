import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { DepartmentScopeGuard } from '../../common/guards/department-scope.guard';
import { BrokerageService } from './brokerage.service';
import {
  CreateBrokeragePurchaseDto,
  CreateBrokerageSaleDto,
  ListBrokeragePurchasesQueryDto,
  ListBrokerageSalesQueryDto,
} from './dto/brokerage.dto';
import { StockWriteoffDto } from '../inventory/dto/stock-writeoff.dto';

@ApiTags('Brokerage')
@Controller('brokerage')
@UseGuards(JwtAuthGuard, DepartmentScopeGuard)
@ApiBearerAuth('JWT-auth')
export class BrokerageController {
  constructor(private readonly brokerageService: BrokerageService) {}

  @Post('purchases')
  @ApiOperation({ summary: 'Create a brokerage purchase' })
  createPurchase(@Request() req, @Body() dto: CreateBrokeragePurchaseDto) {
    return this.brokerageService.createPurchase(dto, req.user.id);
  }

  @Get('purchases')
  @ApiOperation({ summary: 'List brokerage purchases' })
  findAllPurchases(@Query() query: ListBrokeragePurchasesQueryDto) {
    return this.brokerageService.findAllPurchases(query);
  }

  @Get('purchases/:id')
  @ApiOperation({ summary: 'Get brokerage purchase by ID' })
  findOnePurchase(@Param('id') id: string) {
    return this.brokerageService.findPurchaseById(id);
  }

  @Patch('purchases/:id')
  @ApiOperation({ summary: 'Update brokerage purchase' })
  updatePurchase(
    @Param('id') id: string,
    @Body() dto: Partial<CreateBrokeragePurchaseDto>,
  ) {
    return this.brokerageService.updatePurchase(id, dto);
  }

  @Delete('purchases/:id')
  @ApiOperation({ summary: 'Delete brokerage purchase' })
  removePurchase(@Param('id') id: string, @Request() request) {
    return this.brokerageService.deletePurchase(id, request.user.id);
  }

  @Post('sales')
  @ApiOperation({ summary: 'Create a brokerage sale' })
  createSale(@Request() req, @Body() dto: CreateBrokerageSaleDto) {
    return this.brokerageService.createSale(dto, req.user.id);
  }

  @Get('sales')
  @ApiOperation({ summary: 'List brokerage sales' })
  findAllSales(@Query() query: ListBrokerageSalesQueryDto) {
    return this.brokerageService.findAllSales(query);
  }

  @Get('sales/:id')
  @ApiOperation({ summary: 'Get brokerage sale by ID' })
  findOneSale(@Param('id') id: string) {
    return this.brokerageService.findSaleById(id);
  }

  @Patch('sales/:id')
  @ApiOperation({ summary: 'Update brokerage sale' })
  updateSale(
    @Param('id') id: string,
    @Body() dto: Partial<CreateBrokerageSaleDto>,
  ) {
    return this.brokerageService.updateSale(id, dto);
  }

  @Delete('sales/:id')
  @ApiOperation({ summary: 'Delete brokerage sale' })
  removeSale(@Param('id') id: string, @Request() request) {
    return this.brokerageService.deleteSale(id, request.user.id);
  }

  @Get('stock')
  @ApiOperation({ summary: 'Get brokerage stock balance' })
  getStock() {
    return this.brokerageService.getStock();
  }

  @Post('stock/writeoffs')
  @ApiOperation({ summary: 'Create a brokerage stock writeoff' })
  createStockWriteoff(@Request() req, @Body() dto: Partial<StockWriteoffDto>) {
    return this.brokerageService.createStockWriteoff(dto, req.user.id);
  }

  @Get('reports/profit-loss')
  @ApiOperation({ summary: 'Get brokerage profit and loss report' })
  @ApiQuery({ name: 'from', required: false })
  @ApiQuery({ name: 'to', required: false })
  getProfitLoss(@Query('from') from?: string, @Query('to') to?: string) {
    return this.brokerageService.getProfitLoss(from, to);
  }
}
