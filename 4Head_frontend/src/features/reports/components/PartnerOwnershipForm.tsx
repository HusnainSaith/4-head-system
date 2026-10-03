import { useState } from "react";
import { useSelector } from "react-redux";
import { selectCurrentUser } from "@/features/auth/authSlice";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getApiErrorMessage } from "@/lib/api-error";
import { useSavePartnerSharesMutation } from "../reportsApi";
import type { PartnerProfitShare } from "../types";

export function PartnerOwnershipForm({
  department,
  onSaved,
}: {
  department: PartnerProfitShare["departments"][number];
  onSaved: () => void;
}) {
  const user = useSelector(selectCurrentUser);
  const [save, state] = useSavePartnerSharesMutation();
  const [values, setValues] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [selectedMode, setSelectedMode] = useState<
    "equal" | "percentage" | null
  >(null);
  const mode = selectedMode ?? department.allocationMode ?? "percentage";
  if (
    user?.role?.name?.toLowerCase() !== "owner" ||
    !department.partners.length
  )
    return null;
  return (
    <form
      className="space-y-3"
      onSubmit={async (event) => {
        event.preventDefault();
        setError("");
        try {
          await save({
            departmentId: department.departmentId,
            allocationMode: mode,
            shares: department.partners.map((p) => ({
              userId: p.userId,
              ...(mode === "percentage"
                ? { percentage: values[p.userId] ?? p.percentage ?? "0" }
                : {}),
            })),
          }).unwrap();
          setValues({});
          setError("");
          onSaved();
        } catch (failure) {
          setError(getApiErrorMessage(failure));
        }
      }}
    >
      <fieldset className="flex flex-wrap gap-4">
        <legend className="mb-2 text-sm font-medium">Ownership split</legend>
        <label className="flex items-center gap-2">
          <input
            type="radio"
            name={`ownership-${department.departmentId}`}
            checked={mode === "equal"}
            onChange={() => {
              setSelectedMode("equal");
              setError("");
            }}
          />
          Equal partners
        </label>
        <label className="flex items-center gap-2">
          <input
            type="radio"
            name={`ownership-${department.departmentId}`}
            checked={mode === "percentage"}
            onChange={() => {
              setSelectedMode("percentage");
              setError("");
            }}
          />
          Custom percentages
        </label>
      </fieldset>
      {mode === "equal" ? (
        <p>
          Each partner owns exactly 1/{department.partners.length} of this
          department. Profit and loss are split equally; indivisible paisa are
          allocated automatically.
        </p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-3">
          {department.partners.map((p) => (
            <label key={p.userId} className="space-y-1 text-sm">
              <span>{p.partnerName} ownership (%)</span>
              <Input
                type="number"
                min="0"
                max="100"
                step="0.0001"
                required
                value={values[p.userId] ?? p.percentage ?? ""}
                onChange={(e) =>
                  setValues((previous) => ({
                    ...previous,
                    [p.userId]: e.target.value,
                  }))
                }
              />
            </label>
          ))}
        </div>
      )}
      <p className="text-sm text-muted-foreground">
        {mode === "percentage" && "Total must be 100%. "}Saving updates the
        preview. Post the selected period to apply the allocation to actual
        accounts.
      </p>
      {error && <p role="alert">{error}</p>}
      <Button type="submit" disabled={state.isLoading}>
        {mode === "equal" ? "Save equal shares" : "Save ownership percentages"}
      </Button>
    </form>
  );
}
