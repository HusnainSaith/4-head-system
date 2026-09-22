import { useEffect, useState } from "react";
import { z } from "zod";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const stockWriteoffReasons = [
  "spoilage",
  "mortality",
  "transit_loss",
  "other",
] as const;

export type StockWriteoffReason = (typeof stockWriteoffReasons)[number];

export interface StockWriteoffInput {
  quantityKg: number;
  ratePerKg: number;
  reason: StockWriteoffReason;
  note?: string;
  writeoffDate: string;
  stockType?: "live" | "dressed";
}

const schema = z.object({
  quantityKg: z.number().positive("Weight must be greater than zero."),
  ratePerKg: z.number().positive("Sale rate must be greater than zero."),
  reason: z.enum(stockWriteoffReasons),
  note: z.string().max(255, "Note must be 255 characters or fewer.").optional(),
  writeoffDate: z.string().min(1, "Date is required."),
  stockType: z.enum(["live", "dressed"]).optional(),
});

export function StockWriteoffDialog({
  open,
  availableKg,
  loading,
  onClose,
  onSubmit,
  stockOptions,
  initialValue,
}: {
  open: boolean;
  availableKg: string;
  loading: boolean;
  onClose: () => void;
  onSubmit: (body: StockWriteoffInput) => Promise<void>;
  stockOptions?: Array<{
    value: "live" | "dressed";
    label: string;
    availableKg: string;
  }>;
  initialValue?: StockWriteoffInput;
}) {
  const [quantity, setQuantity] = useState("");
  const [rate, setRate] = useState("");
  const [reason, setReason] = useState<StockWriteoffReason>("spoilage");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [stockType, setStockType] = useState<"live" | "dressed">(
    stockOptions?.[0]?.value ?? "live",
  );
  const effectiveAvailable =
    stockOptions?.find((option) => option.value === stockType)?.availableKg ??
    availableKg;

  useEffect(() => {
    if (!open || !initialValue) return;
    setQuantity(String(initialValue.quantityKg));
    setRate(String(initialValue.ratePerKg));
    setReason(initialValue.reason);
    setDate(initialValue.writeoffDate.slice(0, 10));
    setNote(initialValue.note ?? "");
    if (initialValue.stockType) setStockType(initialValue.stockType);
  }, [open, initialValue]);

  const reset = () => {
    setQuantity("");
    setRate("");
    setReason("spoilage");
    setDate(new Date().toISOString().slice(0, 10));
    setNote("");
    setError("");
    setStockType(stockOptions?.[0]?.value ?? "live");
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !next && handleClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{initialValue ? "Edit Shrinkage" : "Add Shrinkage"}</DialogTitle>
          <DialogDescription>
            Available: {effectiveAvailable} kg. Amount is calculated using the
            sale rate entered below.
          </DialogDescription>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={async (event) => {
            event.preventDefault();
            const parsed = schema.safeParse({
              quantityKg: Number(quantity),
              ratePerKg: Number(rate),
              reason,
              writeoffDate: date,
              note: note.trim() || undefined,
              stockType: stockOptions ? stockType : undefined,
            });
            if (!parsed.success) {
              setError(parsed.error.issues[0]?.message ?? "Check the form.");
              return;
            }
            if (parsed.data.quantityKg > Number(effectiveAvailable)) {
              setError(
                `Insufficient stock. Available: ${effectiveAvailable} kg.`,
              );
              return;
            }
            setError("");
            await onSubmit(parsed.data);
            reset();
          }}
        >
          {error ? (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}
          {stockOptions ? (
            <div className="space-y-1.5">
              <Label>Stock pool *</Label>
              <Select
                value={stockType}
                onValueChange={(value) => {
                  setStockType(value as "live" | "dressed");
                  setError("");
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {stockOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label} ({option.availableKg} kg)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}
          <div className="space-y-1.5">
            <Label htmlFor="shrinkage-quantity">Weight (kg) *</Label>
            <Input
              id="shrinkage-quantity"
              type="number"
              min="0.001"
              max={effectiveAvailable}
              step="0.001"
              required
              value={quantity}
              onChange={(event) => setQuantity(event.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="shrinkage-rate">Sale rate per kg *</Label>
            <Input
              id="shrinkage-rate"
              type="number"
              min="0.01"
              step="0.01"
              required
              value={rate}
              onChange={(event) => setRate(event.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Reason *</Label>
            <Select
              value={reason}
              onValueChange={(value) => setReason(value as StockWriteoffReason)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {stockWriteoffReasons.map((item) => (
                  <SelectItem key={item} value={item}>
                    {item.replaceAll("_", " ")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="shrinkage-date">Date *</Label>
            <Input
              id="shrinkage-date"
              type="date"
              required
              value={date}
              onChange={(event) => setDate(event.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="shrinkage-note">Note</Label>
            <Input
              id="shrinkage-note"
              maxLength={255}
              value={note}
              onChange={(event) => setNote(event.target.value)}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit" isLoading={loading}>
              {initialValue ? "Save changes" : "Record shrinkage"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
