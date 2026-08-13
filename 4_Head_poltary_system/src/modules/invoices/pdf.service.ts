import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as pdfMake from 'pdfmake/build/pdfmake';
import pdfFonts = require('pdfmake/build/vfs_fonts');
import type { TDocumentDefinitions } from 'pdfmake/interfaces';
import { Invoice } from './invoice.entity';

export interface CompanyConfig {
  name: string;
  address: string;
  phone: string;
}

@Injectable()
export class PdfService {
  constructor(private readonly config: ConfigService) {
    Object.assign(pdfMake, { vfs: pdfFonts });
  }

  getCompanyConfig(): CompanyConfig {
    return {
      name: this.config.get('COMPANY_NAME', '4Head Poultry'),
      address: this.config.get('COMPANY_ADDRESS', ''),
      phone: this.config.get('COMPANY_PHONE', ''),
    };
  }

  buildInvoiceDoc(
    invoice: Invoice,
    company = this.getCompanyConfig(),
  ): TDocumentDefinitions {
    const money = (value: string | number) =>
      `Rs. ${Number(value).toLocaleString('en-PK', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`;
    return {
      pageSize: 'A4',
      pageMargins: [40, 40, 40, 55],
      content: [
        { text: company.name, style: 'company' },
        {
          text: [company.address, company.phone].filter(Boolean).join(' | '),
          alignment: 'center',
        },
        { text: 'INVOICE', style: 'heading' },
        {
          columns: [
            [
              { text: `Invoice #: ${invoice.invoiceNumber}`, bold: true },
              { text: `Type: ${invoice.invoiceType.toUpperCase()}` },
              { text: `Status: ${invoice.status.toUpperCase()}` },
            ],
            [
              {
                text: `Date: ${new Date(invoice.issuedAt).toLocaleDateString('en-PK')}`,
                alignment: 'right',
              },
              {
                text: `Department: ${invoice.department?.name ?? invoice.departmentId}`,
                alignment: 'right',
              },
            ],
          ],
          margin: [0, 0, 0, 16],
        },
        ...(invoice.partyName || invoice.party?.name
          ? [
              {
                text: `Party: ${invoice.partyName ?? invoice.party?.name}`,
                margin: [0, 0, 0, 12] as [number, number, number, number],
              },
            ]
          : []),
        {
          table: {
            headerRows: 1,
            widths: [22, '*', 45, 40, 65, 75],
            body: [
              ['#', 'Description', 'Qty', 'Unit', 'Rate/kg', 'Amount'].map(
                (text) => ({ text, bold: true, fillColor: '#f0f0f0' }),
              ),
              ...invoice.lineItems.map((item, index) => [
                String(index + 1),
                item.description,
                Number(item.qty).toFixed(3),
                item.unit,
                money(item.rate),
                money(item.amount),
              ]),
            ],
          },
          layout: 'lightHorizontalLines',
        },
        {
          table: {
            widths: ['*', 100],
            body: [
              [
                { text: 'Subtotal', alignment: 'right' },
                { text: money(invoice.subtotal), alignment: 'right' },
              ],
              [
                { text: 'Tax (0%)', alignment: 'right' },
                { text: money(invoice.taxAmount), alignment: 'right' },
              ],
              [
                { text: 'Total', alignment: 'right', bold: true },
                {
                  text: money(invoice.totalAmount),
                  alignment: 'right',
                  bold: true,
                },
              ],
            ],
          },
          layout: 'noBorders',
          margin: [0, 18, 0, 0] as [number, number, number, number],
        },
        ...(invoice.notes
          ? [
              {
                text: `Notes: ${invoice.notes}`,
                margin: [0, 18, 0, 0] as [number, number, number, number],
              },
            ]
          : []),
      ],
      footer: {
        text: 'Thank you for your business | 4Head ERP',
        alignment: 'center',
        color: '#666666',
        fontSize: 9,
      },
      styles: {
        company: { fontSize: 20, bold: true, alignment: 'center' },
        heading: {
          fontSize: 16,
          bold: true,
          alignment: 'center',
          margin: [0, 18, 0, 18],
        },
      },
      defaultStyle: { fontSize: 10 },
    };
  }

  generate(doc: TDocumentDefinitions): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        pdfMake
          .createPdf(doc)
          .getBuffer((buffer) => resolve(Buffer.from(buffer)));
      } catch (error) {
        reject(error);
      }
    });
  }
}
