import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { ArrowDownCircle, ArrowUpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Form } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FormField } from "@/components/common/FormField";
import { getApiErrorMessage } from "@/lib/api-error";
import { useAdjustCashDrawerMutation } from "../accountsApi";
import type { CashAdjustmentType } from "../types";

const schema = z.object({
  amount: z
    .string()
    .min(1, "Amount is required")
    .refine((v) => Number(v) > 0, "Must be greater than zero"),
  notes: z.string(),
  date: z.string(),
});

type FormValues = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onClose: () => void;
  cashAccountId: string;
  drawerName: string;
  type: CashAdjustmentType;
}

export function CashAdjustmentModal({ open, onClose, cashAccountId, drawerName, type }: Props) {
  const [adjust, { isLoading }] = useAdjustCashDrawerMutation();
  const isDeposit = type === "deposit";

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      amount: "",
      notes: "",
      date: new Date().toISOString().slice(0, 10),
    },
  });

  useEffect(() => {
    if (open)
      form.reset({ amount: "", notes: "", date: new Date().toISOString().slice(0, 10) });
  }, [open, form]);

  const onSubmit = async (values: FormValues) => {
    try {
      await adjust({
        id: cashAccountId,
        body: {
          type,
          amount: Number(values.amount),
          notes: values.notes || undefined,
          date: values.date || undefined,
        },
      }).unwrap();
      toast.success(isDeposit ? "Cash deposited successfully" : "Cash withdrawn successfully");
      onClose();
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isDeposit ? (
              <ArrowDownCircle className="h-5 w-5 text-emerald-600" />
            ) : (
              <ArrowUpCircle className="h-5 w-5 text-red-500" />
            )}
            {isDeposit ? "Deposit Cash" : "Withdraw Cash"} — {drawerName}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)} noValidate>
            <FormField control={form.control} name="amount" label="Amount (Rs)" required>
              {(field) => (
                <Input {...field} type="number" min="0.01" step="0.01" placeholder="0.00" autoFocus />
              )}
            </FormField>

            <FormField control={form.control} name="date" label="Date">
              {(field) => <Input {...field} type="date" />}
            </FormField>

            <FormField control={form.control} name="notes" label="Notes">
              {(field) => <Textarea {...field} placeholder="Optional description" rows={2} />}
            </FormField>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button
                type="submit"
                isLoading={isLoading}
                variant={isDeposit ? "default" : "destructive"}
              >
                {isDeposit ? "Deposit" : "Withdraw"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
