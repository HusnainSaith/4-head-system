import {
  BarChart3,
  Bell,
  Bird,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  FileText,
  PackageOpen,
  Store,
  Truck,
  UserRoundCog,
  UsersRound,
  Warehouse,
  ShieldCheck,
  WalletCards,
  HandCoins,
  HeartHandshake,
} from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { DepartmentCode, Role } from "@/types/enums";

const COLORS = {
  bg: "#14213D",
  bgHover: "#1c2e52",
  border: "#1e3060",
  gold: "#FCA311",
  goldBg: "rgba(252,163,17,0.12)",
  text: "#E5E5E5",
  textMuted: "#8fa3c8",
  textActive: "#FCA311",
};

const departmentPaths: Record<DepartmentCode, string> = {
  [DepartmentCode.BROKERAGE]: "/brokerage",
  [DepartmentCode.SUPPLY]: "/supply",
  [DepartmentCode.WASTAGE]: "/wastage",
  [DepartmentCode.FRESH_CHICKEN_SHOP]: "/shop",
};

const navigation = [
  { label: "Dashboard", to: "/", icon: BarChart3 },
  {
    label: "Brokerage",
    to: "/brokerage",
    icon: Bird,
    department: DepartmentCode.BROKERAGE,
    children: [
      { label: "Purchases", to: "/brokerage/purchases" },
      { label: "Sales", to: "/brokerage/sales" },
      { label: "Stock", to: "/brokerage/stock" },
      { label: "Reports", to: "/brokerage/reports/profit-loss" },
    ],
  },
  {
    label: "Supply",
    to: "/supply",
    icon: Warehouse,
    department: DepartmentCode.SUPPLY,
    children: [
      { label: "Purchases", to: "/supply/purchases" },
      { label: "Sales", to: "/supply/sales" },
      { label: "Internal Transfers", to: "/supply/internal-transfers" },
      { label: "Stock", to: "/supply/stock" },
      { label: "Reports", to: "/supply/reports/profit-loss" },
    ],
  },
  {
    label: "Wastage",
    to: "/wastage",
    icon: PackageOpen,
    department: DepartmentCode.WASTAGE,
    children: [
      { label: "Purchases", to: "/wastage/purchases" },
      { label: "Sales", to: "/wastage/sales" },
      { label: "Stock", to: "/wastage/stock" },
      { label: "Reports", to: "/wastage/reports/profit-loss" },
    ],
  },
  {
    label: "Fresh Chicken Shop",
    to: "/shop",
    icon: Store,
    department: DepartmentCode.FRESH_CHICKEN_SHOP,
    children: [
      { label: "Incoming Transfers", to: "/shop/incoming-transfers" },
      { label: "Dressing Batches", to: "/shop/dressing-batches" },
      { label: "Sales", to: "/shop/sales" },
      { label: "Stock", to: "/shop/stock" },
      { label: "Reports", to: "/shop/reports/profit-loss" },
    ],
  },
  { label: "Parties", to: "/parties", icon: UsersRound },
  {
    label: "Vehicles",
    to: "/vehicles",
    icon: Truck,
    children: [
      { label: "Vehicles", to: "/vehicles" },
      { label: "Fuel Logs", to: "/vehicles/fuel-logs" },
      { label: "Maintenance Logs", to: "/vehicles/maintenance-logs" },
    ],
  },
  {
    label: "Employees & Payroll",
    to: "/employees",
    icon: UserRoundCog,
    children: [
      { label: "Employees", to: "/employees" },
      { label: "Salary Runs", to: "/payroll/runs", managementOnly: true },
    ],
  },
  { label: "Expenses", to: "/expenses", icon: CircleDollarSign },
  {
    label: "Cash & Bank",
    to: "/accounts",
    icon: WalletCards,
    managementOnly: true,
  },
  {
    label: "Investments",
    to: "/investments",
    icon: HandCoins,
    managementOnly: true,
  },
  {
    label: "Committees",
    to: "/committees",
    icon: UsersRound,
    managementOnly: true,
  },
  {
    label: "Zakat & Funds",
    to: "/zakat-funds",
    icon: HeartHandshake,
    managementOnly: true,
  },
  { label: "Invoices", to: "/invoices", icon: FileText, managementOnly: true },
  {
    label: "Notifications",
    to: "/notifications",
    icon: Bell,
    managementOnly: true,
  },
  {
    label: "Reports",
    to: "/reports/consolidated-profit-loss",
    icon: FileText,
    children: [
      { label: "Consolidated P&L", to: "/reports/consolidated-profit-loss" },
      { label: "Partner Profit Share", to: "/reports/partner-profit-share" },
      { label: "Outstanding Balances", to: "/reports/outstanding-balances" },
      { label: "Stock Summary", to: "/reports/stock-summary" },
      { label: "Expense Breakdown", to: "/reports/expense-breakdown" },
      { label: "Payroll Summary", to: "/reports/payroll-summary" },
    ],
  },
  {
    label: "Users & Roles",
    to: "/users",
    icon: ShieldCheck,
    ownerOnly: true,
    children: [
      { label: "Users", to: "/users" },
      { label: "Roles", to: "/roles" },
    ],
  },
] as const;

function visibleNavigation(
  role: Role | null,
  departmentCode: DepartmentCode | null,
) {
  if (role === Role.DEPARTMENT_STAFF) {
    return navigation.filter(
      (item) =>
        item.to === "/" ||
        item.to === "/vehicles" ||
        item.to === "/parties" ||
        item.to === "/employees" ||
        item.to === "/expenses" ||
        ("department" in item && item.department === departmentCode),
    );
  }
  if (role === Role.OWNER) return navigation;
  if (role === Role.ACCOUNTANT) {
    return navigation.filter(
      (item) => !("ownerOnly" in item && item.ownerOnly),
    );
  }
  return navigation.slice(0, 1);
}

export function Sidebar({
  collapsed,
  onCollapsedChange,
  role,
  departmentCode,
}: {
  collapsed: boolean;
  onCollapsedChange: (collapsed: boolean) => void;
  role: Role | null;
  departmentCode: DepartmentCode | null;
}) {
  const items = visibleNavigation(role, departmentCode);
  const { pathname } = useLocation();
  const [expandedMenu, setExpandedMenu] = useState<string | null>(null);

  return (
    <aside
      id="app-sidebar"
      style={{
        backgroundColor: COLORS.bg,
        borderRight: `1px solid ${COLORS.border}`,
        width: collapsed ? 68 : 240,
      }}
      className={cn(
        "sticky top-0 flex h-screen shrink-0 flex-col transition-all duration-200",
      )}
    >
      {/* Brand */}
      <div
        style={{ borderBottom: `1px solid ${COLORS.border}` }}
        className={cn(
          "flex h-16 shrink-0 items-center gap-3 px-4",
          collapsed && "justify-center px-0",
        )}
      >
        <div
          style={{ backgroundColor: COLORS.gold }}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
        >
          <Bird className="h-4 w-4 text-black" aria-hidden />
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <p
              style={{ color: "#ffffff" }}
              className="truncate text-sm font-bold tracking-widest uppercase"
            >
              Poultry ERP
            </p>
            <p
              style={{ color: COLORS.textMuted }}
              className="text-xs tracking-widest uppercase"
            >
              Management
            </p>
          </div>
        )}
      </div>

      {/* Nav items */}
      <nav
        className="sidebar-scroll flex-1 overflow-y-auto overflow-x-hidden px-2 py-2"
        aria-label="Primary"
      >
        {items.map((item) => {
          const { label, to, icon: Icon } = item;
          const hasChildren = "children" in item;
          const isExpanded = expandedMenu === to;
          const submenuId =
            "sidebar-submenu-" +
            label.toLowerCase().replace(/[^a-z0-9]+/g, "-");
          const isSectionActive =
            hasChildren &&
            item.children.some(
              (child) =>
                pathname === child.to || pathname.startsWith(child.to + "/"),
            );
          const parentStyle = {
            display: "flex",
            alignItems: "center",
            gap: "10px",
            height: "40px",
            padding: "0 12px",
            justifyContent: collapsed ? "center" : "flex-start",
            borderRadius: "8px",
            fontSize: "13px",
            fontWeight: 500,
            color: isSectionActive ? COLORS.textActive : COLORS.text,
            backgroundColor: isSectionActive ? COLORS.goldBg : "transparent",
            borderLeft: isSectionActive
              ? `3px solid ${COLORS.gold}`
              : "3px solid transparent",
            transition: "all 0.15s",
          } as const;

          return (
            <div key={to} className="mb-0.5">
              {hasChildren ? (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      className="block w-full text-left"
                      aria-label={collapsed ? label : undefined}
                      aria-expanded={isExpanded}
                      aria-controls={submenuId}
                      onClick={() => {
                        if (collapsed) {
                          setExpandedMenu(to);
                          onCollapsedChange(false);
                        } else {
                          setExpandedMenu((current) =>
                            current === to ? null : to,
                          );
                        }
                      }}
                    >
                      <span style={parentStyle}>
                        <Icon
                          style={{
                            color: isSectionActive
                              ? COLORS.textActive
                              : COLORS.text,
                            flexShrink: 0,
                            width: 18,
                            height: 18,
                          }}
                          aria-hidden
                        />
                        {!collapsed && (
                          <>
                            <span className="min-w-0 flex-1">{label}</span>
                            <ChevronRight
                              className={cn(
                                "h-3.5 w-3.5 transition-transform",
                                isExpanded && "rotate-90",
                              )}
                              aria-hidden
                            />
                          </>
                        )}
                      </span>
                    </button>
                  </TooltipTrigger>
                  {collapsed && (
                    <TooltipContent side="right">{label}</TooltipContent>
                  )}
                </Tooltip>
              ) : (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <NavLink
                      to={to}
                      end={to === "/"}
                      aria-label={collapsed ? label : undefined}
                    >
                      {({ isActive }) => (
                        <span
                          style={{
                            ...parentStyle,
                            color: isActive ? COLORS.textActive : COLORS.text,
                            backgroundColor: isActive
                              ? COLORS.goldBg
                              : "transparent",
                            borderLeft: isActive
                              ? `3px solid ${COLORS.gold}`
                              : "3px solid transparent",
                          }}
                        >
                          <Icon
                            style={{
                              color: isActive ? COLORS.textActive : COLORS.text,
                              flexShrink: 0,
                              width: 18,
                              height: 18,
                            }}
                            aria-hidden
                          />
                          {!collapsed && <span>{label}</span>}
                        </span>
                      )}
                    </NavLink>
                  </TooltipTrigger>
                  {collapsed && (
                    <TooltipContent side="right">{label}</TooltipContent>
                  )}
                </Tooltip>
              )}

              {!collapsed && hasChildren && isExpanded && (
                <div
                  id={submenuId}
                  style={{
                    borderLeft: `1px solid ${COLORS.border}`,
                    marginLeft: "30px",
                    paddingLeft: "8px",
                    marginTop: "2px",
                  }}
                >
                  {item.children
                    .filter(
                      (child) =>
                        !("managementOnly" in child) ||
                        role !== Role.DEPARTMENT_STAFF,
                    )
                    .map((child) => (
                      <NavLink
                        key={child.to}
                        to={child.to}
                        style={({ isActive }) => ({
                          display: "flex",
                          alignItems: "center",
                          height: "32px",
                          padding: "0 10px",
                          borderRadius: "6px",
                          fontSize: "12px",
                          fontWeight: isActive ? 600 : 400,
                          textDecoration: "none",
                          color: isActive
                            ? COLORS.textActive
                            : COLORS.textMuted,
                          backgroundColor: isActive
                            ? COLORS.goldBg
                            : "transparent",
                          marginBottom: "2px",
                          transition: "all 0.15s",
                        })}
                      >
                        {child.label}
                      </NavLink>
                    ))}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* Collapse toggle */}
      <div
        style={{ borderTop: `1px solid ${COLORS.border}` }}
        className="shrink-0 p-2"
      >
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size={collapsed ? "icon" : "sm"}
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              aria-controls="app-sidebar"
              aria-expanded={!collapsed}
              onClick={() => onCollapsedChange(!collapsed)}
              style={{ color: COLORS.textMuted, width: "100%" }}
              className="h-9 rounded-lg hover:bg-white/10"
            >
              {collapsed ? (
                <ChevronRight className="h-4 w-4" />
              ) : (
                <>
                  <ChevronLeft className="h-4 w-4" />
                  <span>Collapse</span>
                </>
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">
            {collapsed ? "Expand" : "Collapse"}
          </TooltipContent>
        </Tooltip>
      </div>

      {role === Role.DEPARTMENT_STAFF && departmentCode ? (
        <span className="sr-only">
          Department navigation is restricted to{" "}
          {departmentPaths[departmentCode]}.
        </span>
      ) : null}
    </aside>
  );
}
import { useState } from "react";
