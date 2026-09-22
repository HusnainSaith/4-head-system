import { useState } from "react";
import { ArrowDownCircle, ArrowUpCircle, Building2, Landmark, Plus, Smartphone, WalletCards } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/common/ErrorState";
import { PageHeader } from "@/components/common/PageHeader";
import { PageSkeleton } from "@/components/common/Skeletons";
import { PageContainer } from "@/components/layout/PageContainer";
import { useGetAccountsSummaryQuery } from "../accountsApi";
import { AddBankAccountModal } from "./AddBankAccountModal";
import { CashAdjustmentModal } from "./CashAdjustmentModal";
import { BankAdjustmentModal } from "./BankAdjustmentModal";
import type { CashAdjustmentType } from "../types";

const money = new Intl.NumberFormat("en-PK", { style: "currency", currency: "PKR", minimumFractionDigits: 2 });
const fmt = (value: string) => money.format(Number(value));

interface AdjustState {
  cashAccountId: string;
  drawerName: string;
  type: CashAdjustmentType;
}

interface BankAdjustState {
  bankAccountId: string;
  accountName: string;
  type: CashAdjustmentType;
}

export function CashBankDashboardPage() {
  const navigate = useNavigate();
  const [adding, setAdding] = useState(false);
  const [adjusting, setAdjusting] = useState<AdjustState | null>(null);
  const [bankAdjusting, setBankAdjusting] = useState<BankAdjustState | null>(null);
  const query = useGetAccountsSummaryQuery();

  if (query.isLoading) return <PageSkeleton rows={6} />;
  if (query.isError || !query.data?.data)
    return (
      <PageContainer>
        <ErrorState title="Accounts could not be loaded" error={query.error} onRetry={() => void query.refetch()} />
      </PageContainer>
    );

  const summary = query.data.data;

  return (
    <PageContainer>
      <PageHeader
        title="Cash & Bank"
        description="Live balances derived from posted ledger entries."
        actions={
          <Button onClick={() => setAdding(true)}>
            <Plus className="h-4 w-4" />
            Add bank account
          </Button>
        }
      />

      {/* Summary cards */}
      <section className="grid gap-4 md:grid-cols-3">
        {[
          { label: "Total cash", value: summary.totalCash, icon: WalletCards, tone: "text-emerald-700" },
          { label: "Total bank", value: summary.totalBank, icon: Landmark, tone: "text-blue-700" },
          { label: "Total funds", value: summary.totalFunds, icon: Building2, tone: "text-primary" },
        ].map(({ label, value, icon: Icon, tone }) => (
          <article key={label} className="rounded-xl border bg-card p-5 shadow-sm">
            <div className="mb-3 flex items-center justify-between text-sm text-muted-foreground">
              <span>{label}</span>
              <Icon className="h-5 w-5" />
            </div>
            <p className={`text-2xl font-bold ${tone}`}>{fmt(value)}</p>
          </article>
        ))}
      </section>

      {/* Cash drawers */}
      <section className="mt-8">
        <h2 className="mb-4 text-lg font-semibold">Cash drawers</h2>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {summary.cashAccounts.map((item) => (
            <article
              key={item.account.id}
              className="rounded-xl border border-l-4 border-l-emerald-500 bg-card p-5 shadow-sm"
            >
              <p className="text-sm font-medium text-muted-foreground">{item.account.accountName}</p>
              <p className={`my-2 text-xl font-bold ${Number(item.currentBalance) < 0 ? "text-red-600" : "text-emerald-700"}`}>
                {fmt(item.currentBalance)}
              </p>
              <p className="text-xs text-muted-foreground">
                In {fmt(item.totalIn)} · Out {fmt(item.totalOut)}
              </p>

              {/* Deposit / Withdraw buttons */}
              <div className="mt-4 grid grid-cols-2 gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="border-emerald-500 text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800"
                  onClick={() =>
                    setAdjusting({
                      cashAccountId: item.account.id,
                      drawerName: item.account.accountName,
                      type: "deposit",
                    })
                  }
                >
                  <ArrowDownCircle className="mr-1 h-4 w-4" />
                  Deposit
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="border-red-400 text-red-600 hover:bg-red-50 hover:text-red-700"
                  onClick={() =>
                    setAdjusting({
                      cashAccountId: item.account.id,
                      drawerName: item.account.accountName,
                      type: "withdraw",
                    })
                  }
                >
                  <ArrowUpCircle className="mr-1 h-4 w-4" />
                  Withdraw
                </Button>
              </div>

              <Button
                className="mt-2 w-full"
                size="sm"
                variant="ghost"
                onClick={() => navigate(`/accounts/cash/${item.account.id}/statement`)}
              >
                View statement
              </Button>
            </article>
          ))}
        </div>
      </section>

      {/* Bank accounts */}
      <section className="mt-8">
        <h2 className="mb-4 text-lg font-semibold">Bank accounts</h2>
        {summary.bankAccounts.length === 0 ? (
          <div className="rounded-xl border border-dashed p-10 text-center text-muted-foreground">
            No bank accounts yet.
          </div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {summary.bankAccounts.map((item) => (
              <article key={item.account.id} className="rounded-xl border border-l-4 border-l-blue-500 bg-card p-5 shadow-sm">
                <div className="flex justify-between gap-4">
                  <div>
                    <h3 className="font-semibold">{item.account.bankName}</h3>
                    <p className="text-sm text-muted-foreground">{item.account.accountTitle}</p>
                    {item.account.accountNumber && (
                      <p className="text-xs text-muted-foreground">A/C {item.account.accountNumber}</p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-xs uppercase text-muted-foreground">Balance</p>
                    <p className="text-xl font-bold text-blue-700">{fmt(item.currentBalance)}</p>
                  </div>
                </div>
                <div className="my-4 grid grid-cols-2 gap-3 border-y py-3 text-sm">
                  <div>Cheque in <strong className="block text-emerald-700">{fmt(item.chequeIn)}</strong></div>
                  <div>Cheque out <strong className="block text-red-600">{fmt(item.chequeOut)}</strong></div>
                  <div>
                    <Smartphone className="mr-1 inline h-3 w-3" />
                    App in <strong className="block text-emerald-700">{fmt(item.appIn)}</strong>
                  </div>
                  <div>
                    <Smartphone className="mr-1 inline h-3 w-3" />
                    App out <strong className="block text-red-600">{fmt(item.appOut)}</strong>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-emerald-500 text-emerald-700"
                    onClick={() =>
                      setBankAdjusting({
                        bankAccountId: item.account.id,
                        accountName: `${item.account.bankName} · ${item.account.accountTitle}`,
                        type: "deposit",
                      })
                    }
                  >
                    <ArrowDownCircle className="mr-1 h-4 w-4" />
                    Deposit
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-red-400 text-red-600"
                    onClick={() =>
                      setBankAdjusting({
                        bankAccountId: item.account.id,
                        accountName: `${item.account.bankName} · ${item.account.accountTitle}`,
                        type: "withdraw",
                      })
                    }
                  >
                    <ArrowUpCircle className="mr-1 h-4 w-4" />
                    Withdraw
                  </Button>
                  <Button size="sm" onClick={() => navigate(`/accounts/bank/${item.account.id}/statement`)}>
                    Full statement
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => navigate(`/accounts/bank/${item.account.id}/statement?method=cheque`)}>
                    Cheques
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => navigate(`/accounts/bank/${item.account.id}/statement?method=app`)}>
                    App
                  </Button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <AddBankAccountModal open={adding} onClose={() => setAdding(false)} />

      {adjusting && (
        <CashAdjustmentModal
          open
          onClose={() => setAdjusting(null)}
          cashAccountId={adjusting.cashAccountId}
          drawerName={adjusting.drawerName}
          type={adjusting.type}
        />
      )}
      {bankAdjusting && (
        <BankAdjustmentModal
          open
          onClose={() => setBankAdjusting(null)}
          bankAccountId={bankAdjusting.bankAccountId}
          accountName={bankAdjusting.accountName}
          type={bankAdjusting.type}
        />
      )}
    </PageContainer>
  );
}
