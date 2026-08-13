import { Input } from "@/components/ui/input";
import {
  useGetBankAccountsQuery,
  useGetCashAccountsQuery,
} from "../accountsApi";
import type { BankMethod, PaymentAccountSelection } from "../types";

export function PaymentAccountFields({
  paymentMethod,
  value,
  onChange,
  departmentId,
}: {
  paymentMethod: "cash" | "bank" | "credit";
  value: PaymentAccountSelection;
  onChange: (next: PaymentAccountSelection) => void;
  departmentId?: string;
}) {
  const cash = useGetCashAccountsQuery(undefined, {
    skip: paymentMethod !== "cash",
  });
  const bank = useGetBankAccountsQuery(undefined, {
    skip: paymentMethod !== "bank",
  });
  if (paymentMethod === "credit") return null;
  const selectClass = "h-9 w-full rounded-lg border bg-background px-3 text-sm";
  if (paymentMethod === "cash") {
    const options = (cash.data?.data ?? []).filter(
      (item) => !departmentId || item.account.departmentId === departmentId,
    );
    return (
      <div className="space-y-1.5 text-sm">
        <label htmlFor="payment-cash-account">Cash drawer *</label>
        <select
          id="payment-cash-account"
          className={selectClass}
          required
          value={value.cashAccountId ?? ""}
          onChange={(event) =>
            onChange({ cashAccountId: event.target.value || undefined })
          }
        >
          <option value="">Select cash drawer</option>
          {options.map((item) => (
            <option key={item.account.id} value={item.account.id}>
              {item.account.accountName} · Rs{" "}
              {Number(item.currentBalance).toLocaleString("en-PK")}
            </option>
          ))}
        </select>
      </div>
    );
  }
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div className="space-y-1.5 text-sm">
        <label htmlFor="payment-bank-account">Bank account *</label>
        <select
          id="payment-bank-account"
          className={selectClass}
          required
          value={value.bankAccountId ?? ""}
          onChange={(event) =>
            onChange({
              ...value,
              bankAccountId: event.target.value || undefined,
            })
          }
        >
          <option value="">Select bank account</option>
          {(bank.data?.data ?? []).map((item) => (
            <option key={item.account.id} value={item.account.id}>
              {item.account.bankName} · {item.account.accountTitle}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-1.5 text-sm">
        <label htmlFor="payment-bank-method">Bank method *</label>
        <select
          id="payment-bank-method"
          className={selectClass}
          required
          value={value.bankTransactionMethod ?? ""}
          onChange={(event) =>
            onChange({
              ...value,
              bankTransactionMethod: (event.target.value || undefined) as
                BankMethod | undefined,
              chequeNumber: undefined,
              appReference: undefined,
            })
          }
        >
          <option value="">Select method</option>
          <option value="cheque">Cheque</option>
          <option value="app">Mobile app</option>
        </select>
      </div>
      {value.bankTransactionMethod === "cheque" ? (
        <div className="space-y-1.5 text-sm">
          <label htmlFor="payment-cheque-number">Cheque number *</label>
          <Input
            id="payment-cheque-number"
            required
            value={value.chequeNumber ?? ""}
            onChange={(event) =>
              onChange({ ...value, chequeNumber: event.target.value })
            }
          />
        </div>
      ) : null}
      {value.bankTransactionMethod === "app" ? (
        <div className="space-y-1.5 text-sm">
          <label htmlFor="payment-app-reference">App reference</label>
          <Input
            id="payment-app-reference"
            value={value.appReference ?? ""}
            onChange={(event) =>
              onChange({ ...value, appReference: event.target.value })
            }
          />
        </div>
      ) : null}
    </div>
  );
}
