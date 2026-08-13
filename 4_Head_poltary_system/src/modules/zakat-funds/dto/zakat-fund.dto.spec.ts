import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { RecordZakatFundPaymentDto } from './zakat-fund.dto';

describe('RecordZakatFundPaymentDto', () => {
  it('treats blank optional text fields as omitted', async () => {
    const dto = plainToInstance(RecordZakatFundPaymentDto, {
      departmentId: '9941ecd2-7e9b-4d33-a3e5-d3c341869020',
      accountType: 'zakat',
      amount: '12',
      paymentDate: '2026-08-12',
      paymentMethod: 'cash',
      cashAccountId: '0a9f272a-fb71-4a76-b29c-9421b05ec080',
      recipientName: 'ali',
      reference: '',
      notes: '   ',
    });

    expect(dto.reference).toBeUndefined();
    expect(dto.notes).toBeUndefined();
    await expect(validate(dto)).resolves.toEqual([]);
  });
});
