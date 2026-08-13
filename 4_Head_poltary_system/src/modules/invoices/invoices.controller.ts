import { Controller, Get, Param, Post, Query, Req, Res } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { Roles } from '../../common/decorators/roles.decorator';
import { RoleEnum } from '../../common/enums/role.enum';
import { InvoiceQueryDto } from './invoice.dto';
import { InvoicesService } from './invoices.service';

@ApiTags('Invoices')
@ApiBearerAuth('JWT-auth')
@Controller('invoices')
@Roles(RoleEnum.OWNER, RoleEnum.ACCOUNTANT)
export class InvoicesController {
  constructor(private readonly service: InvoicesService) {}

  @Get()
  @ApiOperation({ summary: 'List invoices' })
  findAll(@Query() query: InvoiceQueryDto) {
    return this.service.findAll(query);
  }

  @Get('by-source/:sourceType/:sourceId')
  @ApiOperation({ summary: 'Find the invoice for a business transaction' })
  findBySource(
    @Param('sourceType') sourceType: string,
    @Param('sourceId') sourceId: string,
  ) {
    return this.service.findBySource(sourceType, sourceId);
  }

  @Post('by-source/:sourceType/:sourceId')
  @ApiOperation({
    summary: 'Generate a missing invoice from a posted transaction',
  })
  ensureBySource(
    @Param('sourceType') sourceType: string,
    @Param('sourceId') sourceId: string,
    @Req() req: Request,
  ) {
    return this.service.ensureBySource(
      sourceType,
      sourceId,
      (req as any).user.id,
    );
  }

  @Get(':id/pdf')
  @ApiOperation({ summary: 'Download invoice PDF' })
  async pdf(@Param('id') id: string, @Res() response: Response) {
    const invoice = await this.service.findOne(id);
    const buffer = await this.service.generatePdf(id);
    response.setHeader('Content-Type', 'application/pdf');
    response.setHeader(
      'Content-Disposition',
      `attachment; filename="${invoice.invoiceNumber}.pdf"`,
    );
    response.send(buffer);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get invoice by ID' })
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post(':id/cancel')
  @ApiOperation({ summary: 'Cancel an invoice' })
  cancel(@Param('id') id: string, @Req() req: Request) {
    return this.service.cancel(id, (req as any).user.id);
  }
}
