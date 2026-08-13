import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { RoleEnum } from '../../common/enums/role.enum';
import { CreateExpenseAllocationDto } from './dto/create-expense-allocation.dto';
import { ExpenseAllocationsService } from './expense-allocations.service';

@Controller('expense-allocations')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(RoleEnum.OWNER, RoleEnum.ACCOUNTANT)
export class ExpenseAllocationsController {
  constructor(private readonly service: ExpenseAllocationsService) {}
  @Get() list() {
    return this.service.list();
  }
  @Post() create(@Body() dto: CreateExpenseAllocationDto, @Req() req: any) {
    return this.service.create(dto, req.user.id);
  }
  @Get(':id') get(@Param('id') id: string) {
    return this.service.findOne(id);
  }
  @Delete(':id') remove(@Param('id') id: string, @Req() req: any) {
    return this.service.remove(id, req.user.id);
  }
}
