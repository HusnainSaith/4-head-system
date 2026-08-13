import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Param,
  ParseUUIDPipe,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { StockMovementService } from './stock-movement.service';
import { CreateStockMovementDto } from './dto/create-stock-movement.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { DepartmentScopeGuard } from '../../common/guards/department-scope.guard';

@ApiTags('Stock Movements')
@UseGuards(JwtAuthGuard, DepartmentScopeGuard)
@Controller('stock-movements')
export class StockMovementController {
  constructor(private readonly stockMovementService: StockMovementService) {}

  @Post()
  @ApiOperation({ summary: 'Create manual stock movement' })
  create(@Body() createDto: CreateStockMovementDto) {
    return this.stockMovementService.create(createDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all stock movements' })
  findAll(
    @Query('departmentId') departmentId?: string,
    @Query('productId') productId?: string,
  ) {
    return this.stockMovementService.findAll(departmentId, productId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get stock movement by ID' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.stockMovementService.findOne(id);
  }

  @Get('purchase/:purchaseId')
  @ApiOperation({ summary: 'Get stock movements by purchase ID' })
  findByPurchase(@Param('purchaseId', ParseUUIDPipe) purchaseId: string) {
    return this.stockMovementService.findByPurchase(purchaseId);
  }

  @Get('sale/:saleId')
  @ApiOperation({ summary: 'Get stock movements by sale ID' })
  findBySale(@Param('saleId', ParseUUIDPipe) saleId: string) {
    return this.stockMovementService.findBySale(saleId);
  }
}
