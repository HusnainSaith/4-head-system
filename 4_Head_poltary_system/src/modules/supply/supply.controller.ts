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
  Req,
} from '@nestjs/common';
import { Request } from 'express';
import { ApiTags, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { DepartmentScopeGuard } from '../../common/guards/department-scope.guard';
import { SupplyService } from './supply.service';
import {
  CreateSupplyPurchaseDto,
  CreateSupplySaleDto,
  CreateInternalTransferDto,
  SettleTransferDto,
  SupplyListQueryDto,
  TransferListQueryDto,
} from './dto/supply.dto';
import { StockWriteoffDto } from '../inventory/dto/stock-writeoff.dto';

@ApiTags('Supply')
@Controller('supply')
@UseGuards(JwtAuthGuard, DepartmentScopeGuard)
@ApiBearerAuth('JWT-auth')
export class SupplyController {
  constructor(private readonly supplyService: SupplyService) {}

  @Post('purchases')
  createPurchase(
    @Body() dto: CreateSupplyPurchaseDto,
    @Req() request: Request & { user: { id: string } },
  ) {
    return this.supplyService.createPurchase(dto, request.user.id);
  }

  @Get('purchases')
  findAllPurchases(@Query() query: SupplyListQueryDto) {
    return this.supplyService.findAllPurchases(query);
  }

  @Get('purchases/:id')
  findOnePurchase(@Param('id') id: string) {
    return this.supplyService.findPurchaseById(id);
  }

  @Patch('purchases/:id')
  updatePurchase(
    @Param('id') id: string,
    @Body() dto: Partial<CreateSupplyPurchaseDto>,
  ) {
    return this.supplyService.updatePurchase(id, dto);
  }

  @Delete('purchases/:id')
  removePurchase(
    @Param('id') id: string,
    @Req() request: Request & { user: { id: string } },
  ) {
    return this.supplyService.softDeletePurchase(id, request.user.id);
  }

  @Post('sales')
  createSale(
    @Body() dto: CreateSupplySaleDto,
    @Req() request: Request & { user: { id: string } },
  ) {
    return this.supplyService.createSale(dto, request.user.id);
  }

  @Get('sales')
  findAllSales(@Query() query: SupplyListQueryDto) {
    return this.supplyService.findAllSales(query);
  }

  @Get('sales/:id')
  findOneSale(@Param('id') id: string) {
    return this.supplyService.findSaleById(id);
  }

  @Patch('sales/:id')
  updateSale(
    @Param('id') id: string,
    @Body() dto: Partial<CreateSupplySaleDto>,
  ) {
    return this.supplyService.updateSale(id, dto);
  }

  @Delete('sales/:id')
  removeSale(
    @Param('id') id: string,
    @Req() request: Request & { user: { id: string } },
  ) {
    return this.supplyService.softDeleteSale(id, request.user.id);
  }

  @Post('internal-transfers')
  createTransfer(
    @Body() dto: CreateInternalTransferDto,
    @Req() request: Request & { user: { id: string } },
  ) {
    return this.supplyService.createInternalTransfer(dto, request.user.id);
  }

  @Get('internal-transfers')
  findAllTransfers(@Query() query: TransferListQueryDto) {
    return this.supplyService.findAllTransfers(query);
  }

  @Get('internal-transfers/:id')
  findOneTransfer(@Param('id') id: string) {
    return this.supplyService.findTransferById(id);
  }

  @Patch('internal-transfers/:id')
  updateTransfer(
    @Param('id') id: string,
    @Body() dto: Partial<CreateInternalTransferDto>,
  ) {
    return this.supplyService.updateTransfer(id, dto);
  }

  @Post('internal-transfers/:id/settle')
  settleTransfer(
    @Param('id') id: string,
    @Body() dto: SettleTransferDto,
    @Req() request: Request & { user: { id: string } },
  ) {
    return this.supplyService.settleTransfer(id, dto, request.user.id);
  }

  @Get('stock')
  getStock() {
    return this.supplyService.getStock();
  }

  @Post('stock/writeoffs')
  createWriteoff(
    @Body() dto: Partial<StockWriteoffDto>,
    @Req() request: Request & { user: { id: string } },
  ) {
    return this.supplyService.createStockWriteoff(dto, request.user.id);
  }

  @Get('reports/profit-loss')
  @ApiQuery({ name: 'from', required: false })
  @ApiQuery({ name: 'to', required: false })
  getProfitLoss(@Query('from') from?: string, @Query('to') to?: string) {
    return this.supplyService.getProfitLoss(from, to);
  }
}
