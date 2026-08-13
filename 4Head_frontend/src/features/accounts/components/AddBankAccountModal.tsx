import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useCreateBankAccountMutation } from "../accountsApi";

export function AddBankAccountModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [createBank, state] = useCreateBankAccountMutation();
  const [fields, setFields] = useState({
    bankName: "",
    accountTitle: "",
    accountNumber: "",
    branchName: "",
    openingBalance: "0",
    openingBalanceDate: new Date().toISOString().slice(0, 10),
  });
  const set = (name: keyof typeof fields, value: string) =>
    setFields((current) => ({ ...current, [name]: value }));
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (
      fields.bankName.trim().length < 2 ||
      fields.accountTitle.trim().length < 2
    )
      return;
    try {
      await createBank({
        ...fields,
        accountNumber: fields.accountNumber || undefined,
        branchName: fields.branchName || undefined,
        openingBalance: Number(fields.openingBalance),
        openingBalanceDate: fields.openingBalanceDate || undefined,
      }).unwrap();
      toast.success("Bank account added");
      onClose();
    } catch {
      toast.error("Bank account could not be added");
    }
  };
  const textFields = [
    ["bankName", "Bank name *"],
    ["accountTitle", "Account title *"],
    ["accountNumber", "Account number"],
    ["branchName", "Branch name"],
  ] as const;
  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add bank account</DialogTitle>
          <DialogDescription>
            Balances remain derived from the immutable ledger.
          </DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={submit}>
          <div className="grid gap-4 sm:grid-cols-2">
            {textFields.map(([name, label]) => (
              <div className="space-y-1 text-sm" key={name}>
                <label htmlFor={`bank-${name}`}>{label}</label>
                <Input
                  id={`bank-${name}`}
                  value={fields[name]}
                  onChange={(event) => set(name, event.target.value)}
                  required={name === "bankName" || name === "accountTitle"}
                />
              </div>
            ))}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1 text-sm">
              <label htmlFor="bank-opening-balance">Opening balance</label>
              <Input
                id="bank-opening-balance"
                type="number"
                min="0"
                step="0.01"
                value={fields.openingBalance}
                onChange={(event) => set("openingBalance", event.target.value)}
              />
            </div>
            <div className="space-y-1 text-sm">
              <label htmlFor="bank-balance-date">Balance date</label>
              <Input
                id="bank-balance-date"
                type="date"
                value={fields.openingBalanceDate}
                onChange={(event) =>
                  set("openingBalanceDate", event.target.value)
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" isLoading={state.isLoading}>
              Save account
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
