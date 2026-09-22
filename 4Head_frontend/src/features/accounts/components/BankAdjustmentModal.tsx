import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowDownCircle, ArrowUpCircle } from "lucide-react";
import { toast } from "sonner";
import { FormField } from "@/components/common/FormField";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form } from "@/components/ui/form";
import { getApiErrorMessage } from "@/lib/api-error";
import {
  useAdjustBankAccountMutation,
  useGetCashAccountsQuery,
} from "../accountsApi";
import type { CashAdjustmentType } from "../types";

const schema = z
  .object({
    amount: z
      .string()
      .min(1, "Amount is required")
      .refine((value) => Number(value) > 0, "Must be greater than zero"),
    cashAccountId: z.string(),
    bankTransactionMethod: z.enum(["cheque", "app"]),
    chequeNumber: z.string(),
    appReference: z.string(),
    notes: z.string(),
    date: z.string(),
  })
  .superRefine((values, context) => {
    if (
      values.bankTransactionMethod === "cheque" &&
      !values.chequeNumber.trim()
    ) {
      context.addIssue({
        code: "custom",
        path: ["chequeNumber"],
        message: "Cheque number is required",
      });
    }
  });

type FormValues = z.infer<typeof schema>;

export function BankAdjustmentModal({
  open,
  onClose,
  bankAccountId,
  accountName,
  type,
}: {
  open: boolean;
  onClose: () => void;
  bankAccountId: string;
  accountName: string;
  type: CashAdjustmentType;
}) {
  const [adjust, { isLoading }] = useAdjustBankAccountMutation();
  const isDeposit = type === "deposit";
  const cashAccountsQuery = useGetCashAccountsQuery(undefined, {
    skip: !open || !isDeposit,
  });
  const cashAccounts = cashAccountsQuery.data?.data ?? [];
  const defaultCashAccountId =
    cashAccounts.length === 1 ? cashAccounts[0].account.id : "";
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      amount: "",
      cashAccountId: "",
      bankTransactionMethod: "app",
      chequeNumber: "",
      appReference: "",
      notes: "",
      date: new Date().toISOString().slice(0, 10),
    },
  });
  const method = form.watch("bankTransactionMethod");

  useEffect(() => {
    if (open) {
      form.reset({
        amount: "",
        cashAccountId: defaultCashAccountId,
        bankTransactionMethod: "app",
        chequeNumber: "",
        appReference: "",
        notes: "",
        date: new Date().toISOString().slice(0, 10),
      });
    }
  }, [defaultCashAccountId, form, open]);

  const submit = async (values: FormValues) => {
    if (isDeposit && !values.cashAccountId) {
      form.setError("cashAccountId", {
        message: "Select the cash drawer that funds this bank deposit",
      });
      return;
    }
    try {
      await adjust({
        id: bankAccountId,
        body: {
          type,
          amount: Number(values.amount),
          cashAccountId: isDeposit ? values.cashAccountId : undefined,
          bankTransactionMethod: values.bankTransactionMethod,
          chequeNumber:
            values.bankTransactionMethod === "cheque"
              ? values.chequeNumber.trim()
              : undefined,
          appReference:
            values.bankTransactionMethod === "app"
              ? values.appReference.trim() || undefined
              : undefined,
          notes: values.notes.trim() || undefined,
          date: values.date || undefined,
        },
      }).unwrap();
      toast.success(
        isDeposit
          ? "Bank deposit recorded successfully"
          : "Bank withdrawal recorded successfully",
      );
      onClose();
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    }
  };

  return (
    <Dialog open={open} onOpenChange={(value) => !value && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isDeposit ? (
              <ArrowDownCircle className="h-5 w-5 text-emerald-600" />
            ) : (
              <ArrowUpCircle className="h-5 w-5 text-red-500" />
            )}
            {isDeposit ? "Deposit to Bank" : "Withdraw from Bank"} — {accountName}
          </DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form
            className="space-y-4"
            onSubmit={form.handleSubmit(submit)}
            noValidate
          >
            <FormField control={form.control} name="amount" label="Amount (Rs)" required>
              {(field) => (
                <Input {...field} type="number" min="0.01" step="0.01" autoFocus />
              )}
            </FormField>
            {isDeposit ? (
              <FormField
                control={form.control}
                name="cashAccountId"
                label="Source cash drawer"
                required
              >
                {(field) => (
                  <select
                    {...field}
                    className="h-10 w-full rounded-lg border bg-background px-3"
                    disabled={cashAccountsQuery.isLoading}
                  >
                    <option value="">
                      {cashAccountsQuery.isLoading
                        ? "Loading cash drawers..."
                        : "Select cash drawer"}
                    </option>
                    {cashAccounts.map(({ account, currentBalance }) => (
                      <option key={account.id} value={account.id}>
                        {account.accountName} — Rs {Number(currentBalance).toLocaleString("en-PK")}
                      </option>
                    ))}
                  </select>
                )}
              </FormField>
            ) : null}
            <FormField control={form.control} name="bankTransactionMethod" label="Bank method" required>
              {(field) => (
                <select {...field} className="h-10 w-full rounded-lg border bg-background px-3">
                  <option value="app">App / bank transfer</option>
                  <option value="cheque">Cheque</option>
                </select>
              )}
            </FormField>
            {method === "cheque" ? (
              <FormField control={form.control} name="chequeNumber" label="Cheque number" required>
                {(field) => <Input {...field} />}
              </FormField>
            ) : (
              <FormField control={form.control} name="appReference" label="Transfer reference">
                {(field) => <Input {...field} placeholder="Optional reference" />}
              </FormField>
            )}
            <FormField control={form.control} name="date" label="Date">
              {(field) => <Input {...field} type="date" />}
            </FormField>
            <FormField control={form.control} name="notes" label="Notes">
              {(field) => <Textarea {...field} rows={2} placeholder="Optional description" />}
            </FormField>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
              <Button type="submit" isLoading={isLoading} variant={isDeposit ? "default" : "destructive"}>
                {isDeposit ? "Deposit" : "Withdraw"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
