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
import type { Request } from 'express';
import { ApiTags, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { DepartmentScopeGuard } from '../../common/guards/department-scope.guard';
import { WastageService } from './wastage.service';
import {
  CreateWastagePurchaseDto,
  CreateWastageSaleDto,
} from './dto/wastage.dto';
import { StockWriteoffDto } from '../inventory/dto/stock-writeoff.dto';

@ApiTags('Wastage')
@Controller('wastage')
@UseGuards(JwtAuthGuard, DepartmentScopeGuard)
@ApiBearerAuth('JWT-auth')
export class WastageController {
  constructor(private readonly wastageService: WastageService) {}

  @Post('purchases')
  createPurchase(@Body() dto: CreateWastagePurchaseDto, @Req() req: Request) {
    return this.wastageService.createPurchase(dto, (req as any).user.id);
  }

  @Get('purchases')
  findAllPurchases() {
    return this.wastageService.findAllPurchases();
  }

  @Get('purchases/:id')
  findOnePurchase(@Param('id') id: string) {
    return this.wastageService.findPurchaseById(id);
  }

  @Patch('purchases/:id')
  updatePurchase(
    @Param('id') id: string,
    @Body() dto: Partial<CreateWastagePurchaseDto>,
  ) {
    return this.wastageService.updatePurchase(id, dto);
  }

  @Delete('purchases/:id')
  removePurchase(@Param('id') id: string, @Req() req: Request) {
    return this.wastageService.softDeletePurchase(id, (req as any).user.id);
  }

  @Post('sales')
  createSale(@Body() dto: CreateWastageSaleDto, @Req() req: Request) {
    return this.wastageService.createSale(dto, (req as any).user.id);
  }

  @Get('sales')
  findAllSales() {
    return this.wastageService.findAllSales();
  }

  @Get('sales/:id')
  findOneSale(@Param('id') id: string) {
    return this.wastageService.findSaleById(id);
  }

  @Patch('sales/:id')
  updateSale(
    @Param('id') id: string,
    @Body() dto: Partial<CreateWastageSaleDto>,
  ) {
    return this.wastageService.updateSale(id, dto);
  }

  @Delete('sales/:id')
  removeSale(@Param('id') id: string, @Req() req: Request) {
    return this.wastageService.softDeleteSale(id, (req as any).user.id);
  }

  @Get('stock')
  getStock() {
    return this.wastageService.getStock();
  }

  @Post('stock/writeoffs')
  createStockWriteoff(@Body() dto: StockWriteoffDto, @Req() req: Request) {
    return this.wastageService.createStockWriteoff(dto, (req as any).user.id);
  }
  @Get('stock/writeoffs')
  listStockWriteoffs() { return this.wastageService.listStockWriteoffs(); }
  @Get('stock/writeoffs/:id')
  getStockWriteoff(@Param('id') id: string) { return this.wastageService.getStockWriteoff(id); }
  @Patch('stock/writeoffs/:id')
  updateStockWriteoff(@Param('id') id: string, @Body() dto: Partial<StockWriteoffDto>, @Req() req: Request) { return this.wastageService.updateStockWriteoff(id, dto, (req as any).user.id); }
  @Delete('stock/writeoffs/:id')
  deleteStockWriteoff(@Param('id') id: string, @Req() req: Request) { return this.wastageService.deleteStockWriteoff(id, (req as any).user.id); }

  @Get('reports/profit-loss')
  @ApiQuery({ name: 'from', required: false })
  @ApiQuery({ name: 'to', required: false })
  getProfitLoss(@Query('from') from?: string, @Query('to') to?: string) {
    return this.wastageService.getProfitLoss(from, to);
  }
}
