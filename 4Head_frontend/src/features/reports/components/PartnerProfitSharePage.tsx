import { useState } from "react";
import { useSelector } from "react-redux";
import { selectCurrentUser } from "@/features/auth/authSlice";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { getApiErrorMessage } from "@/lib/api-error";
import type { PartnerProfitShare } from "../types";
import { ErrorState } from "@/components/common/ErrorState";
import { PageHeader } from "@/components/common/PageHeader";
import { PageSkeleton } from "@/components/common/Skeletons";
import { StatCard } from "@/components/common/StatCard";
import { PageContainer } from "@/components/layout/PageContainer";
import {
  useGetPartnerProfitShareQuery,
  usePostPartnerProfitMutation,
} from "../reportsApi";
import { DateRange } from "./ReportControls";
import { PartnerOwnershipForm } from "./PartnerOwnershipForm";
const money = new Intl.NumberFormat("en-PK", {
  style: "currency",
  currency: "PKR",
});
export function PartnerProfitSharePage() {
  const user = useSelector(selectCurrentUser);
  const [post, postState] = usePostPartnerProfitMutation();
  const [posting, setPosting] = useState<
    PartnerProfitShare["departments"][number] | null
  >(null);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const q = useGetPartnerProfitShareQuery({
    startDate: from || undefined,
    endDate: to || undefined,
  });
  if (q.isLoading) return <PageSkeleton rows={4} />;
  return (
    <PageContainer>
      <PageHeader title="Partner Profit Share" />
      <DateRange from={from} to={to} onFrom={setFrom} onTo={setTo} />
      {q.isError || !q.data ? (
        <ErrorState
          title="Partner profit share could not be loaded"
          error={q.error}
          onRetry={() => void q.refetch()}
        />
      ) : (
        <>
          <StatCard
            label="Total Department Net Profit"
            value={money.format(Number(q.data.data.netProfit))}
          />
          <p className="text-sm text-muted-foreground">
            These amounts are previews for the selected dates. Post profit /
            loss to accounts to record the allocation in each partner's account.
            Reposting the same period applies only the difference.
          </p>
          {q.data.data.departments.length === 0 && <p>No departments found.</p>}
          {q.data.data.departments.map((department) => (
            <section key={department.departmentId} className="space-y-4">
              <h2 className="text-lg font-semibold">
                {department.departmentName}
              </h2>
              <StatCard
                label="Department Net Profit"
                value={money.format(Number(department.netProfit))}
              />
              {department.partners.length > 0 && !department.configured && (
                <p role="status">
                  Choose equal partners or percentages totaling 100% to allocate
                  this department's profit and loss.
                </p>
              )}
              <PartnerOwnershipForm
                department={department}
                onSaved={() => void q.refetch()}
              />
              {user?.role?.name?.toLowerCase() === "owner" &&
                department.partners.length > 0 && (
                  <Button
                    disabled={
                      !department.configured ||
                      q.isFetching ||
                      postState.isLoading
                    }
                    onClick={() => setPosting(department)}
                  >
                    Post profit / loss to accounts
                  </Button>
                )}
              {department.partners.length === 0 ? (
                <p>
                  No partners assigned. Unallocated profit / loss:{" "}
                  {money.format(Number(department.unallocatedProfit))}
                </p>
              ) : (
                <div className="grid gap-4 sm:grid-cols-3">
                  {department.partners.map((partner) => (
                    <div key={partner.userId} className="space-y-2">
                      <StatCard
                        label={partner.partnerName}
                        value={money.format(Number(partner.profitShare))}
                      />
                      <p className="text-sm text-muted-foreground">
                        {partner.ownershipLabel}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </section>
          ))}
        </>
      )}
      <Dialog
        open={Boolean(posting)}
        onOpenChange={(open) =>
          !open && !postState.isLoading && setPosting(null)
        }
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Post partner profit / loss</DialogTitle>
          </DialogHeader>
          {posting && (
            <>
              <p>
                Record {money.format(Number(posting.netProfit))} for{" "}
                {posting.departmentName}, from {from || "1970-01-01"} to{" "}
                {to || new Date().toISOString().slice(0, 10)}, in the linked
                partner accounts?
              </p>
              <ul>
                {posting.partners.map((partner) => (
                  <li key={partner.userId}>
                    {partner.partnerName}:{" "}
                    {money.format(Number(partner.profitShare))}
                  </li>
                ))}
              </ul>
              <p>
                This records account balances. Cash and bank funds are
                unchanged. Overlapping periods are blocked to prevent counting
                profit twice.
              </p>
            </>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              disabled={postState.isLoading}
              onClick={() => setPosting(null)}
            >
              Cancel
            </Button>
            <Button
              isLoading={postState.isLoading}
              onClick={() => {
                if (!posting) return;
                void post({
                  departmentId: posting.departmentId,
                  startDate: from || undefined,
                  endDate: to || undefined,
                  expectedNetProfit: posting.netProfit,
                })
                  .unwrap()
                  .then((result) => {
                    toast.success(result.data.message);
                    setPosting(null);
                  })
                  .catch((error) => toast.error(getApiErrorMessage(error)));
              }}
            >
              Confirm posting
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
}
