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
import { FreshChickenShopService } from './fresh-chicken-shop.service';
import { CreateShopSaleDto } from './dto/shop.dto';
import { StockWriteoffDto } from '../inventory/dto/stock-writeoff.dto';
import {
  CreateDressingBatchDto,
  DressingBatchQueryDto,
} from './dto/dressing-batch.dto';
import { StockType } from '../inventory/enums/stock-type.enum';

@ApiTags('Fresh Chicken Shop')
@Controller('shop')
@UseGuards(JwtAuthGuard, DepartmentScopeGuard)
@ApiBearerAuth('JWT-auth')
export class FreshChickenShopController {
  constructor(private readonly shopService: FreshChickenShopService) {}

  @Get('incoming-transfers')
  getIncomingTransfers() {
    return this.shopService.getIncomingTransfers();
  }

  @Post('sales')
  createSale(@Body() dto: CreateShopSaleDto, @Req() req: Request) {
    return this.shopService.createSale(dto, (req as any).user.id);
  }

  @Get('sales')
  findAllSales() {
    return this.shopService.findAllSales();
  }

  @Get('sales/:id')
  findOneSale(@Param('id') id: string) {
    return this.shopService.findSaleById(id);
  }

  @Patch('sales/:id')
  updateSale(@Param('id') id: string, @Body() dto: Partial<CreateShopSaleDto>) {
    return this.shopService.updateSale(id, dto);
  }

  @Delete('sales/:id')
  removeSale(@Param('id') id: string, @Req() req: Request) {
    return this.shopService.softDeleteSale(id, (req as any).user.id);
  }

  @Get('stock')
  getStock(@Query('type') type?: StockType) {
    return this.shopService.getStock(type);
  }

  @Get('dressing-batches')
  listDressingBatches(@Query() query: DressingBatchQueryDto) {
    return this.shopService.listDressingBatches(query);
  }

  @Post('dressing-batches')
  createDressingBatch(
    @Body() dto: CreateDressingBatchDto,
    @Req() req: Request,
  ) {
    return this.shopService.createDressingBatch(dto, (req as any).user.id);
  }

  @Get('dressing-batches/:id')
  getDressingBatch(@Param('id') id: string) {
    return this.shopService.getDressingBatch(id);
  }

  @Patch('dressing-batches/:id')
  updateDressingBatch(
    @Param('id') id: string,
    @Body() dto: Partial<CreateDressingBatchDto>,
    @Req() req: Request,
  ) {
    return this.shopService.updateDressingBatch(id, dto, (req as any).user.id);
  }

  @Delete('dressing-batches/:id')
  deleteDressingBatch(@Param('id') id: string, @Req() req: Request) {
    return this.shopService.deleteDressingBatch(id, (req as any).user.id);
  }

  @Get('reports/processing-yield')
  processingYield(@Query() query: DressingBatchQueryDto) {
    return this.shopService.getProcessingYield(query);
  }

  @Post('stock/writeoffs')
  createStockWriteoff(@Body() dto: StockWriteoffDto, @Req() req: Request) {
    return this.shopService.createStockWriteoff(dto, (req as any).user.id);
  }
  @Get('stock/writeoffs')
  listStockWriteoffs() { return this.shopService.listStockWriteoffs(); }
  @Get('stock/writeoffs/:id')
  getStockWriteoff(@Param('id') id: string) { return this.shopService.getStockWriteoff(id); }
  @Patch('stock/writeoffs/:id')
  updateStockWriteoff(@Param('id') id: string, @Body() dto: Partial<StockWriteoffDto>, @Req() req: Request) { return this.shopService.updateStockWriteoff(id, dto, (req as any).user.id); }
  @Delete('stock/writeoffs/:id')
  deleteStockWriteoff(@Param('id') id: string, @Req() req: Request) { return this.shopService.deleteStockWriteoff(id, (req as any).user.id); }

  @Get('reports/profit-loss')
  @ApiQuery({ name: 'from', required: false })
  @ApiQuery({ name: 'to', required: false })
  getProfitLoss(@Query('from') from?: string, @Query('to') to?: string) {
    return this.shopService.getProfitLoss(from, to);
  }
}
