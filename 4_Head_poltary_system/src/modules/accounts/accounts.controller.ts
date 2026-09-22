import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Request,
} from '@nestjs/common';
import { AccountsService } from './accounts.service';
import { AccountStatementQueryDto } from './dto/account-statement-query.dto';
import { CreateBankAccountDto } from './dto/create-bank-account.dto';
import { UpdateBankAccountDto } from './dto/update-bank-account.dto';
import { CashAdjustmentDto } from './dto/cash-adjustment.dto';
import { BankAdjustmentDto } from './dto/bank-adjustment.dto';

@Controller('accounts')
export class AccountsController {
  constructor(private readonly accountsService: AccountsService) {}

  @Get('summary') getSummary() {
    return this.accountsService.getFullCashBankSummary();
  }
  @Post('cash/:id/adjust') adjustCash(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CashAdjustmentDto,
    @Request() request: { user: { id: string } },
  ) {
    return this.accountsService.adjustCashDrawer(id, dto, request.user.id);
  }
  @Get('cash') getCash() {
    return this.accountsService.getAllCashBalances();
  }
  @Get('cash/:id/balance') getCashBalance(
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.accountsService.getCashAccountById(id);
  }
  @Get('cash/:id/statement') getCashStatement(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: AccountStatementQueryDto,
  ) {
    return this.accountsService.getCashAccountStatement(
      id,
      new Date(query.from),
      new Date(query.to),
    );
  }
  @Get('bank') getBank() {
    return this.accountsService.getAllBankBalances();
  }
  @Post('bank') createBank(
    @Body() dto: CreateBankAccountDto,
    @Request() request: { user: { id: string } },
  ) {
    return this.accountsService.createBankAccount(dto, request.user.id);
  }
  @Post('bank/:id/adjust') adjustBank(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: BankAdjustmentDto,
    @Request() request: { user: { id: string } },
  ) {
    return this.accountsService.adjustBankAccount(id, dto, request.user.id);
  }
  @Get('bank/:id/balance') getBankBalance(
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.accountsService.getBankAccountBalance(id);
  }
  @Get('bank/:id/statement') getBankStatement(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: AccountStatementQueryDto,
  ) {
    return this.accountsService.getBankAccountStatement(
      id,
      new Date(query.from),
      new Date(query.to),
      query.method,
    );
  }
  @Patch('bank/:id') updateBank(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateBankAccountDto,
    @Request() request: { user: { id: string } },
  ) {
    return this.accountsService.updateBankAccount(id, dto, request.user.id);
  }
  @Delete('bank/:id') deleteBank(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() request: { user: { id: string } },
  ) {
    return this.accountsService.deactivateBankAccount(id, request.user.id);
  }
}
