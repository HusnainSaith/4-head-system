import { PartialType } from '@nestjs/mapped-types';
import { CreateStockBalanceDto } from './create-stock-balance.dto';

export class UpdateStockBalanceDto extends PartialType(CreateStockBalanceDto) {}
