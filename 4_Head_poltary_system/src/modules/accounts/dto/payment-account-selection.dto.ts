import {
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  ValidateIf,
} from 'class-validator';

export type BankTransactionMethod = 'cheque' | 'app';

/** Shared conditional validation for every DTO which moves cash or bank funds. */
export class PaymentAccountSelectionDto {
  @ValidateIf((value) => value.paymentMethod === 'cash')
  @IsUUID()
  cashAccountId?: string;

  @ValidateIf((value) => value.paymentMethod === 'bank')
  @IsUUID()
  bankAccountId?: string;

  @ValidateIf((value) => value.paymentMethod === 'bank')
  @IsIn(['cheque', 'app'])
  bankTransactionMethod?: BankTransactionMethod;

  @ValidateIf((value) => value.bankTransactionMethod === 'cheque')
  @IsString()
  chequeNumber?: string;

  @IsOptional()
  @IsString()
  appReference?: string;
}

export function paymentAccountLink(
  value: PaymentAccountSelectionDto & {
    paymentMethod: 'cash' | 'bank' | 'credit';
  },
) {
  if (value.paymentMethod === 'cash') {
    if (!value.cashAccountId || value.bankAccountId)
      throw new Error('Cash payments require only cashAccountId');
    return { cashAccountId: value.cashAccountId };
  }
  if (value.paymentMethod === 'bank') {
    if (
      !value.bankAccountId ||
      !value.bankTransactionMethod ||
      value.cashAccountId
    )
      throw new Error(
        'Bank payments require bankAccountId and bankTransactionMethod',
      );
    if (value.bankTransactionMethod === 'cheque' && !value.chequeNumber?.trim())
      throw new Error('Cheque payments require chequeNumber');
    return {
      bankAccountId: value.bankAccountId,
      bankTransactionMethod: value.bankTransactionMethod,
      chequeNumber: value.chequeNumber,
      appReference: value.appReference,
    };
  }
  if (value.cashAccountId || value.bankAccountId)
    throw new Error('Credit transactions cannot select a cash or bank account');
  return {};
}
