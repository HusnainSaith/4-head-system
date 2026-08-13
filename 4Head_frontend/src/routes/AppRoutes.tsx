import { lazy, Suspense, type ReactNode } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { ErrorState } from "@/components/common/ErrorState";
import { PageSkeleton } from "@/components/common/Skeletons";
import { PageContainer } from "@/components/layout/PageContainer";
import { DEV_PAGES_ENABLED } from "@/lib/constants";
import { DepartmentScopeGuard } from "@/routes/DepartmentScopeGuard";
import { ProtectedRoute } from "@/routes/ProtectedRoute";
import { RoleGuard } from "@/routes/RoleGuard";
import {
  EmployeeEntityRoute,
  PartyEntityRoute,
  VehicleEntityRoute,
} from "@/routes/ScopedEntityRoute";
import { DepartmentCode, Role } from "@/types/enums";

const LoginPage = lazy(() =>
  import("@/features/auth/components/LoginPage").then((module) => ({
    default: module.LoginPage,
  })),
);
const ForgotPasswordPage = lazy(() =>
  import("@/features/auth/components/PasswordResetPages").then((module) => ({
    default: module.ForgotPasswordPage,
  })),
);
const ResetPasswordPage = lazy(() =>
  import("@/features/auth/components/PasswordResetPages").then((module) => ({
    default: module.ResetPasswordPage,
  })),
);
const DashboardPage = lazy(() =>
  import("@/features/dashboard/components/DashboardPage").then((module) => ({
    default: module.DashboardPage,
  })),
);
const CashBankDashboardPage = lazy(() =>
  import("@/features/accounts/components").then((module) => ({
    default: module.CashBankDashboardPage,
  })),
);
const BankStatementPage = lazy(() =>
  import("@/features/accounts/components").then((module) => ({
    default: module.BankStatementPage,
  })),
);
const CashStatementPage = lazy(() =>
  import("@/features/accounts/components").then((module) => ({
    default: module.CashStatementPage,
  })),
);
const PartiesListPage = lazy(() =>
  import("@/features/parties/components/PartiesListPage").then((module) => ({
    default: module.PartiesListPage,
  })),
);
const PartyStatementPage = lazy(() =>
  import("@/features/parties/components/PartyStatementPage").then((module) => ({
    default: module.PartyStatementPage,
  })),
);
const BrokeragePurchasesPage = lazy(() =>
  import("@/features/brokerage/components/BrokeragePurchasesPage").then(
    (m) => ({ default: m.BrokeragePurchasesPage }),
  ),
);
const BrokerageSalesPage = lazy(() =>
  import("@/features/brokerage/components/BrokerageSalesPage").then((m) => ({
    default: m.BrokerageSalesPage,
  })),
);
const BrokerageStockPage = lazy(() =>
  import("@/features/brokerage/components/BrokerageStockPage").then((m) => ({
    default: m.BrokerageStockPage,
  })),
);
const BrokerageReportPage = lazy(() =>
  import("@/features/brokerage/components/BrokerageReportPage").then((m) => ({
    default: m.BrokerageReportPage,
  })),
);
const SupplyPurchasesPage = lazy(() =>
  import("@/features/supply/components/SupplyPurchasesPage").then((m) => ({
    default: m.SupplyPurchasesPage,
  })),
);
const SupplySalesPage = lazy(() =>
  import("@/features/supply/components/SupplySalesPage").then((m) => ({
    default: m.SupplySalesPage,
  })),
);
const SupplyStockPage = lazy(() =>
  import("@/features/supply/components/SupplyStockPage").then((m) => ({
    default: m.SupplyStockPage,
  })),
);
const InternalTransfersPage = lazy(() =>
  import("@/features/supply/components/InternalTransfersPage").then((m) => ({
    default: m.InternalTransfersPage,
  })),
);
const SupplyReportPage = lazy(() =>
  import("@/features/supply/components/SupplyReportPage").then((m) => ({
    default: m.SupplyReportPage,
  })),
);
const WastagePurchasesPage = lazy(() =>
  import("@/features/wastage/components/WastagePurchasesPage").then((m) => ({
    default: m.WastagePurchasesPage,
  })),
);
const WastageSalesPage = lazy(() =>
  import("@/features/wastage/components/WastageSalesPage").then((m) => ({
    default: m.WastageSalesPage,
  })),
);
const WastageStockPage = lazy(() =>
  import("@/features/wastage/components/WastageStockPage").then((m) => ({
    default: m.WastageStockPage,
  })),
);
const WastageReportPage = lazy(() =>
  import("@/features/wastage/components/WastageReportPage").then((m) => ({
    default: m.WastageReportPage,
  })),
);
const VehiclesListPage = lazy(() =>
  import("@/features/vehicles/components/VehiclesListPage").then((m) => ({
    default: m.VehiclesListPage,
  })),
);
const VehicleDetailPage = lazy(() =>
  import("@/features/vehicles/components/VehicleDetailPage").then((m) => ({
    default: m.VehicleDetailPage,
  })),
);
const FuelLogsDirectoryPage = lazy(() =>
  import("@/features/vehicles/components/VehicleLogDirectoryPage").then(
    (m) => ({ default: m.FuelLogsDirectoryPage }),
  ),
);
const MaintenanceLogsDirectoryPage = lazy(() =>
  import("@/features/vehicles/components/VehicleLogDirectoryPage").then(
    (m) => ({ default: m.MaintenanceLogsDirectoryPage }),
  ),
);
const VehicleFuelLogsPage = lazy(() =>
  import("@/features/vehicles/components/VehicleFuelLogsPage").then((m) => ({
    default: m.VehicleFuelLogsPage,
  })),
);
const VehicleMaintenanceLogsPage = lazy(() =>
  import("@/features/vehicles/components/VehicleMaintenanceLogsPage").then(
    (m) => ({ default: m.VehicleMaintenanceLogsPage }),
  ),
);
const EmployeesListPage = lazy(() =>
  import("@/features/employees/components").then((m) => ({
    default: m.EmployeesListPage,
  })),
);
const EmployeeDetailPage = lazy(() =>
  import("@/features/employees/components").then((m) => ({
    default: m.EmployeeDetailPage,
  })),
);
const EmployeeAdvancesPage = lazy(() =>
  import("@/features/employees/components").then((m) => ({
    default: m.EmployeeAdvancesPage,
  })),
);
const EmployeeBonusesPage = lazy(() =>
  import("@/features/employees/components").then((m) => ({
    default: m.EmployeeBonusesPage,
  })),
);
const RunPayrollPage = lazy(() =>
  import("@/features/employees/components").then((m) => ({
    default: m.RunPayrollPage,
  })),
);
const SalaryRunsPage = lazy(() =>
  import("@/features/employees/components").then((m) => ({
    default: m.SalaryRunsPage,
  })),
);
const SalaryRunDetailPage = lazy(() =>
  import("@/features/employees/components").then((m) => ({
    default: m.SalaryRunDetailPage,
  })),
);
const ExpensesPage = lazy(() =>
  import("@/features/expenses/components").then((m) => ({
    default: m.ExpensesPage,
  })),
);
const CommitteesPage = lazy(() =>
  import("@/features/committees/components/CommitteesPage").then((m) => ({
    default: m.CommitteesPage,
  })),
);
const InvestmentsPage = lazy(() =>
  import("@/features/investments/components").then((m) => ({
    default: m.InvestmentsPage,
  })),
);
const ZakatFundsPage = lazy(() =>
  import("@/features/zakat-funds/components").then((m) => ({
    default: m.ZakatFundsPage,
  })),
);
const UsersListPage = lazy(() =>
  import("@/features/users/components").then((m) => ({
    default: m.UsersListPage,
  })),
);
const RolesListPage = lazy(() =>
  import("@/features/roles/components").then((m) => ({
    default: m.RolesListPage,
  })),
);
const InvoicesListPage = lazy(() =>
  import("@/features/invoices/components").then((m) => ({
    default: m.InvoicesListPage,
  })),
);
const NotificationsListPage = lazy(() =>
  import("@/features/notifications/components").then((m) => ({
    default: m.NotificationsListPage,
  })),
);
const ConsolidatedPnLPage = lazy(() =>
  import("@/features/reports/components").then((m) => ({
    default: m.ConsolidatedPnLPage,
  })),
);
const PartnerProfitSharePage = lazy(() =>
  import("@/features/reports/components").then((m) => ({
    default: m.PartnerProfitSharePage,
  })),
);
const OutstandingBalancesPage = lazy(() =>
  import("@/features/reports/components").then((m) => ({
    default: m.OutstandingBalancesPage,
  })),
);
const StockSummaryPage = lazy(() =>
  import("@/features/reports/components").then((m) => ({
    default: m.StockSummaryPage,
  })),
);
const ExpenseBreakdownPage = lazy(() =>
  import("@/features/reports/components").then((m) => ({
    default: m.ExpenseBreakdownPage,
  })),
);
const PayrollSummaryPage = lazy(() =>
  import("@/features/reports/components").then((m) => ({
    default: m.PayrollSummaryPage,
  })),
);
const ShopIncomingTransfersPage = lazy(() =>
  import("@/features/fresh-chicken-shop/components/IncomingTransfersPage").then(
    (m) => ({ default: m.IncomingTransfersPage }),
  ),
);
const ShopSalesPage = lazy(() =>
  import("@/features/fresh-chicken-shop/components/ShopSalesPage").then(
    (m) => ({ default: m.ShopSalesPage }),
  ),
);
const ShopStockPage = lazy(() =>
  import("@/features/fresh-chicken-shop/components/ShopStockPage").then(
    (m) => ({ default: m.ShopStockPage }),
  ),
);
const DressingBatchesPage = lazy(() =>
  import("@/features/fresh-chicken-shop/components/DressingBatchesPage").then(
    (m) => ({ default: m.DressingBatchesPage }),
  ),
);
const ShopReportPage = lazy(() =>
  import("@/features/fresh-chicken-shop/components/ShopReportPage").then(
    (m) => ({ default: m.ShopReportPage }),
  ),
);
const AppShell = lazy(() =>
  import("@/components/layout/AppShell").then((module) => ({
    default: module.AppShell,
  })),
);
const StyleGuide = import.meta.env.DEV
  ? lazy(() =>
      import("@/dev/StyleGuide").then((module) => ({
        default: module.StyleGuide,
      })),
    )
  : null;

const managementRoles = [Role.OWNER, Role.ACCOUNTANT] as const;
const partyRoles = [
  Role.OWNER,
  Role.ACCOUNTANT,
  Role.DEPARTMENT_STAFF,
] as const;
const brokerageRoles = [
  Role.OWNER,
  Role.ACCOUNTANT,
  Role.DEPARTMENT_STAFF,
] as const;
const wastageRoles = [
  Role.OWNER,
  Role.ACCOUNTANT,
  Role.DEPARTMENT_STAFF,
] as const;
const supplyRoles = [
  Role.OWNER,
  Role.ACCOUNTANT,
  Role.DEPARTMENT_STAFF,
] as const;
const shopRoles = [Role.OWNER, Role.ACCOUNTANT, Role.DEPARTMENT_STAFF] as const;

function ShopAccess({ children }: { children: ReactNode }) {
  return (
    <RoleGuard allowedRoles={shopRoles}>
      <DepartmentScopeGuard departmentCode={DepartmentCode.FRESH_CHICKEN_SHOP}>
        {children}
      </DepartmentScopeGuard>
    </RoleGuard>
  );
}

function BrokerageAccess({ children }: { children: ReactNode }) {
  return (
    <RoleGuard allowedRoles={brokerageRoles}>
      <DepartmentScopeGuard departmentCode={DepartmentCode.BROKERAGE}>
        {children}
      </DepartmentScopeGuard>
    </RoleGuard>
  );
}

function WastageAccess({ children }: { children: ReactNode }) {
  return (
    <RoleGuard allowedRoles={wastageRoles}>
      <DepartmentScopeGuard departmentCode={DepartmentCode.WASTAGE}>
        {children}
      </DepartmentScopeGuard>
    </RoleGuard>
  );
}
function SupplyAccess({ children }: { children: ReactNode }) {
  return (
    <RoleGuard allowedRoles={supplyRoles}>
      <DepartmentScopeGuard departmentCode={DepartmentCode.SUPPLY}>
        {children}
      </DepartmentScopeGuard>
    </RoleGuard>
  );
}

export function AppRoutes() {
  return (
    <Suspense fallback={<PageSkeleton rows={5} />}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route
          element={
            <ProtectedRoute>
              <AppShell />
            </ProtectedRoute>
          }
        >
          <Route index element={<DashboardPage />} />
          <Route path="dashboard" element={<Navigate to="/" replace />} />
          <Route
            path="accounts"
            element={
              <RoleGuard allowedRoles={managementRoles}>
                <CashBankDashboardPage />
              </RoleGuard>
            }
          />
          <Route
            path="accounts/bank/:id/statement"
            element={
              <RoleGuard allowedRoles={managementRoles}>
                <BankStatementPage />
              </RoleGuard>
            }
          />
          <Route
            path="accounts/cash/:departmentId/statement"
            element={
              <RoleGuard allowedRoles={managementRoles}>
                <CashStatementPage />
              </RoleGuard>
            }
          />
          <Route
            path="brokerage"
            element={<Navigate to="/brokerage/purchases" replace />}
          />
          <Route
            path="brokerage/purchases"
            element={
              <BrokerageAccess>
                <BrokeragePurchasesPage />
              </BrokerageAccess>
            }
          />
          <Route
            path="brokerage/sales"
            element={
              <BrokerageAccess>
                <BrokerageSalesPage />
              </BrokerageAccess>
            }
          />
          <Route
            path="brokerage/stock"
            element={
              <BrokerageAccess>
                <BrokerageStockPage />
              </BrokerageAccess>
            }
          />
          <Route
            path="brokerage/reports/profit-loss"
            element={
              <BrokerageAccess>
                <BrokerageReportPage />
              </BrokerageAccess>
            }
          />
          <Route
            path="supply"
            element={<Navigate to="/supply/purchases" replace />}
          />
          <Route
            path="supply/purchases"
            element={
              <SupplyAccess>
                <SupplyPurchasesPage />
              </SupplyAccess>
            }
          />
          <Route
            path="supply/sales"
            element={
              <SupplyAccess>
                <SupplySalesPage />
              </SupplyAccess>
            }
          />
          <Route
            path="supply/internal-transfers"
            element={
              <SupplyAccess>
                <InternalTransfersPage />
              </SupplyAccess>
            }
          />
          <Route
            path="supply/stock"
            element={
              <SupplyAccess>
                <SupplyStockPage />
              </SupplyAccess>
            }
          />
          <Route
            path="supply/reports/profit-loss"
            element={
              <SupplyAccess>
                <SupplyReportPage />
              </SupplyAccess>
            }
          />
          <Route
            path="wastage"
            element={<Navigate to="/wastage/purchases" replace />}
          />
          <Route
            path="wastage/purchases"
            element={
              <WastageAccess>
                <WastagePurchasesPage />
              </WastageAccess>
            }
          />
          <Route
            path="wastage/sales"
            element={
              <WastageAccess>
                <WastageSalesPage />
              </WastageAccess>
            }
          />
          <Route
            path="wastage/stock"
            element={
              <WastageAccess>
                <WastageStockPage />
              </WastageAccess>
            }
          />
          <Route
            path="wastage/reports/profit-loss"
            element={
              <WastageAccess>
                <WastageReportPage />
              </WastageAccess>
            }
          />
          <Route
            path="parties"
            element={
              <RoleGuard allowedRoles={partyRoles}>
                <PartiesListPage />
              </RoleGuard>
            }
          />
          <Route
            path="parties/:id"
            element={
              <RoleGuard allowedRoles={partyRoles}>
                <PartyEntityRoute>
                  <PartyStatementPage />
                </PartyEntityRoute>
              </RoleGuard>
            }
          />
          <Route
            path="vehicles"
            element={
              <RoleGuard allowedRoles={partyRoles}>
                <VehiclesListPage />
              </RoleGuard>
            }
          />
          <Route
            path="vehicles/fuel-logs"
            element={
              <RoleGuard allowedRoles={partyRoles}>
                <FuelLogsDirectoryPage />
              </RoleGuard>
            }
          />
          <Route
            path="vehicles/maintenance-logs"
            element={
              <RoleGuard allowedRoles={partyRoles}>
                <MaintenanceLogsDirectoryPage />
              </RoleGuard>
            }
          />
          <Route
            path="vehicles/:id"
            element={
              <RoleGuard allowedRoles={partyRoles}>
                <VehicleEntityRoute>
                  <VehicleDetailPage />
                </VehicleEntityRoute>
              </RoleGuard>
            }
          />
          <Route
            path="vehicles/:id/fuel-logs"
            element={
              <RoleGuard allowedRoles={partyRoles}>
                <VehicleEntityRoute>
                  <VehicleFuelLogsPage />
                </VehicleEntityRoute>
              </RoleGuard>
            }
          />
          <Route
            path="vehicles/:id/maintenance-logs"
            element={
              <RoleGuard allowedRoles={partyRoles}>
                <VehicleEntityRoute>
                  <VehicleMaintenanceLogsPage />
                </VehicleEntityRoute>
              </RoleGuard>
            }
          />
          <Route
            path="employees"
            element={
              <RoleGuard allowedRoles={partyRoles}>
                <EmployeesListPage />
              </RoleGuard>
            }
          />
          <Route
            path="employees/:id"
            element={
              <RoleGuard allowedRoles={partyRoles}>
                <EmployeeEntityRoute>
                  <EmployeeDetailPage />
                </EmployeeEntityRoute>
              </RoleGuard>
            }
          />
          <Route
            path="employees/:id/advances"
            element={
              <RoleGuard allowedRoles={partyRoles}>
                <EmployeeEntityRoute>
                  <EmployeeAdvancesPage />
                </EmployeeEntityRoute>
              </RoleGuard>
            }
          />
          <Route
            path="employees/:id/bonuses"
            element={
              <RoleGuard allowedRoles={partyRoles}>
                <EmployeeEntityRoute>
                  <EmployeeBonusesPage />
                </EmployeeEntityRoute>
              </RoleGuard>
            }
          />
          <Route
            path="payroll/runs"
            element={
              <RoleGuard allowedRoles={managementRoles}>
                <SalaryRunsPage />
              </RoleGuard>
            }
          />
          <Route
            path="payroll/runs/new"
            element={
              <RoleGuard allowedRoles={managementRoles}>
                <RunPayrollPage />
              </RoleGuard>
            }
          />
          <Route
            path="payroll/runs/:id"
            element={
              <RoleGuard allowedRoles={managementRoles}>
                <SalaryRunDetailPage />
              </RoleGuard>
            }
          />
          <Route
            path="expenses"
            element={
              <RoleGuard allowedRoles={partyRoles}>
                <ExpensesPage />
              </RoleGuard>
            }
          />
          <Route
            path="investments"
            element={
              <RoleGuard allowedRoles={managementRoles}>
                <InvestmentsPage />
              </RoleGuard>
            }
          />
          <Route
            path="committees"
            element={
              <RoleGuard allowedRoles={managementRoles}>
                <CommitteesPage />
              </RoleGuard>
            }
          />
          <Route
            path="zakat-funds"
            element={
              <RoleGuard allowedRoles={managementRoles}>
                <ZakatFundsPage />
              </RoleGuard>
            }
          />
          <Route
            path="invoices"
            element={
              <RoleGuard allowedRoles={managementRoles}>
                <InvoicesListPage />
              </RoleGuard>
            }
          />
          <Route
            path="notifications"
            element={
              <RoleGuard allowedRoles={managementRoles}>
                <NotificationsListPage />
              </RoleGuard>
            }
          />
          <Route
            path="reports/consolidated-profit-loss"
            element={
              <RoleGuard allowedRoles={managementRoles}>
                <ConsolidatedPnLPage />
              </RoleGuard>
            }
          />
          <Route
            path="reports/partner-profit-share"
            element={
              <RoleGuard allowedRoles={managementRoles}>
                <PartnerProfitSharePage />
              </RoleGuard>
            }
          />
          <Route
            path="reports/outstanding-balances"
            element={
              <RoleGuard allowedRoles={managementRoles}>
                <OutstandingBalancesPage />
              </RoleGuard>
            }
          />
          <Route
            path="reports/stock-summary"
            element={
              <RoleGuard allowedRoles={managementRoles}>
                <StockSummaryPage />
              </RoleGuard>
            }
          />
          <Route
            path="reports/expense-breakdown"
            element={
              <RoleGuard allowedRoles={managementRoles}>
                <ExpenseBreakdownPage />
              </RoleGuard>
            }
          />
          <Route
            path="reports/payroll-summary"
            element={
              <RoleGuard allowedRoles={managementRoles}>
                <PayrollSummaryPage />
              </RoleGuard>
            }
          />
          <Route
            path="shop"
            element={<Navigate to="/shop/incoming-transfers" replace />}
          />
          <Route
            path="shop/incoming-transfers"
            element={
              <ShopAccess>
                <ShopIncomingTransfersPage />
              </ShopAccess>
            }
          />
          <Route
            path="shop/sales"
            element={
              <ShopAccess>
                <ShopSalesPage />
              </ShopAccess>
            }
          />
          <Route
            path="shop/stock"
            element={
              <ShopAccess>
                <ShopStockPage />
              </ShopAccess>
            }
          />
          <Route
            path="shop/dressing-batches"
            element={
              <ShopAccess>
                <DressingBatchesPage />
              </ShopAccess>
            }
          />
          <Route
            path="shop/reports/profit-loss"
            element={
              <ShopAccess>
                <ShopReportPage />
              </ShopAccess>
            }
          />
          <Route
            path="fresh-chicken-shop"
            element={<Navigate to="/shop/incoming-transfers" replace />}
          />
          <Route
            path="users"
            element={
              <RoleGuard allowedRoles={[Role.OWNER]}>
                <UsersListPage />
              </RoleGuard>
            }
          />
          <Route
            path="roles"
            element={
              <RoleGuard allowedRoles={[Role.OWNER]}>
                <RolesListPage />
              </RoleGuard>
            }
          />
        </Route>

        {DEV_PAGES_ENABLED && StyleGuide ? (
          <Route path="/dev/style-guide" element={<StyleGuide />} />
        ) : null}

        <Route
          path="*"
          element={
            <PageContainer centered>
              <ErrorState
                title="Page not found"
                description="The requested page does not exist."
              />
            </PageContainer>
          }
        />
      </Routes>
    </Suspense>
  );
}
