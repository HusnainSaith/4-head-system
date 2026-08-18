import { useMemo, useState } from "react";
import { Pencil, Plus, UsersRound } from "lucide-react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DataTable, type DataTableColumn } from "@/components/common/DataTable";
import { EmptyState } from "@/components/common/EmptyState";
import { ErrorState } from "@/components/common/ErrorState";
import { PageHeader } from "@/components/common/PageHeader";
import { PageSkeleton } from "@/components/common/Skeletons";
import { PageContainer } from "@/components/layout/PageContainer";
import {
  selectUserDepartmentCode,
  selectUserDepartmentId,
  selectUserRole,
} from "@/features/auth/authSlice";
import { PartyFormDialog } from "@/features/parties/components/PartyFormDialog";
import { useListPartiesQuery } from "@/features/parties/partiesApi";
import { PartyType, type Party } from "@/features/parties/types";
import { departmentOptionsFrom } from "@/features/parties/department-options";
import { Role } from "@/types/enums";
import { useListDepartmentsQuery } from "@/features/vehicles/vehiclesApi";

const PAGE_SIZE = 10;
const ALL_TYPES = "all";
const ALL_DEPARTMENTS = "all";

const partyTypeLabels: Record<PartyType, string> = {
  [PartyType.FARM]: "Farm",
  [PartyType.BROKER]: "Broker",
  [PartyType.SHOP_OWNER]: "Shop owner",
  [PartyType.CUSTOMER]: "Customer",
  [PartyType.FACTORY]: "Factory",
  [PartyType.INTERNAL_DEPARTMENT]: "Internal department",
  [PartyType.RANDOM_USER]: "Random user",
  [PartyType.INVESTOR]: "Investor",
  [PartyType.PARTNER]: "Partner",
  [PartyType.EMPLOYEE]: "Employee",
};

const partyTypeVariants: Record<
  PartyType,
  NonNullable<BadgeProps["variant"]>
> = {
  [PartyType.FARM]: "success",
  [PartyType.BROKER]: "secondary",
  [PartyType.SHOP_OWNER]: "warning",
  [PartyType.CUSTOMER]: "default",
  [PartyType.FACTORY]: "outline",
  [PartyType.INTERNAL_DEPARTMENT]: "destructive",
  [PartyType.RANDOM_USER]: "secondary",
  [PartyType.INVESTOR]: "success",
  [PartyType.PARTNER]: "warning",
  [PartyType.EMPLOYEE]: "outline",
};

export function PartiesListPage() {
  const navigate = useNavigate();
  const role = useSelector(selectUserRole);
  const assignedDepartmentId = useSelector(selectUserDepartmentId);
  const assignedDepartmentCode = useSelector(selectUserDepartmentCode);
  const isDepartmentStaff = role === Role.DEPARTMENT_STAFF;
  const [partyType, setPartyType] = useState<PartyType | typeof ALL_TYPES>(
    ALL_TYPES,
  );
  const [departmentId, setDepartmentId] = useState(ALL_DEPARTMENTS);
  const [nameSearch, setNameSearch] = useState("");
  const [page, setPage] = useState(1);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingParty, setEditingParty] = useState<Party | null>(null);

  const effectiveDepartmentId = isDepartmentStaff
    ? (assignedDepartmentId ?? undefined)
    : departmentId === ALL_DEPARTMENTS
      ? undefined
      : departmentId;

  const partiesQuery = useListPartiesQuery({
    page,
    limit: PAGE_SIZE,
    type: partyType === ALL_TYPES ? undefined : partyType,
    departmentId: effectiveDepartmentId,
    search: nameSearch.trim() || undefined,
  });
  const departmentsQuery = useListDepartmentsQuery();

  const paginatedData = partiesQuery.data?.data;
  const parties = useMemo(() => paginatedData?.items ?? [], [paginatedData]);
  const pagination = paginatedData?.pagination;

  const departmentOptions = useMemo(
    () =>
      departmentOptionsFrom(
        departmentsQuery.data?.data ?? [],
        parties,
        assignedDepartmentId,
        assignedDepartmentCode,
      ),
    [
      assignedDepartmentCode,
      assignedDepartmentId,
      departmentsQuery.data?.data,
      parties,
    ],
  );
  const departmentNameById = useMemo(
    () => new Map(departmentOptions.map(({ id, name }) => [id, name])),
    [departmentOptions],
  );

  const totalRecords = pagination?.total ?? 0;

  const columns = useMemo<DataTableColumn<Party>[]>(
    () => [
      { id: "name", header: "Name", cell: (party) => party.name },
      {
        id: "partyType",
        header: "Party type",
        cell: (party) => (
          <Badge variant={partyTypeVariants[party.partyType]}>
            {partyTypeLabels[party.partyType]}
          </Badge>
        ),
      },
      {
        id: "phone",
        header: "Phone",
        cell: (party) => party.phone ?? "—",
      },
      {
        id: "balance",
        header: "Current balance",
        cell: (party) => {
          const balance = Number(party.currentBalance ?? 0);
          if (balance === 0) return <Badge variant="outline">Zero / Nil</Badge>;
          const formatted = new Intl.NumberFormat("en-PK").format(
            Math.abs(balance),
          );
          return (
            <span className={balance > 0 ? "text-green-600" : "text-red-600"}>
              {balance > 0 ? "+" : "-"} {formatted}
            </span>
          );
        },
        align: "right",
      },
      {
        id: "primaryDepartment",
        header: "Primary department",
        cell: (party) =>
          party.primaryDepartment?.name ??
          (party.primaryDepartmentId
            ? (departmentNameById.get(party.primaryDepartmentId) ?? "—")
            : "—"),
      },
      {
        id: "linkedDepartments",
        header: "Linked departments",
        cell: (party) => {
          const linked = party.departments?.length
            ? party.departments
            : [party.primaryDepartment, party.linkedDepartment].filter(
                (department): department is { id: string; name: string } =>
                  Boolean(department),
              );
          return linked.length ? (
            <div className="flex flex-wrap gap-1">
              {linked.map((department) => (
                <Badge key={department.id} variant="secondary">
                  {department.name ??
                    departmentNameById.get(department.id) ??
                    "Department"}
                </Badge>
              ))}
            </div>
          ) : (
            "â€”"
          );
        },
      },
      {
        id: "actions",
        header: "Actions",
        align: "right",
        cell: (party) =>
          party.partyType === PartyType.INTERNAL_DEPARTMENT ? null : (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={(event) => {
                event.stopPropagation();
                setEditingParty(party);
                setDialogOpen(true);
              }}
            >
              <Pencil aria-hidden />
              Edit
            </Button>
          ),
      },
    ],
    [departmentNameById],
  );

  const changeFilter = (change: () => void) => {
    change();
    setPage(1);
  };

  if (partiesQuery.isLoading) return <PageSkeleton rows={6} />;
  if (partiesQuery.isError) {
    return (
      <PageContainer>
        <ErrorState
          title="Parties could not be loaded"
          error={partiesQuery.error}
          onRetry={() => void partiesQuery.refetch()}
        />
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageHeader
        title="Parties"
        description="Manage external parties and open their ledger statements."
        actions={
          <Button
            onClick={() => {
              setEditingParty(null);
              setDialogOpen(true);
            }}
          >
            <Plus aria-hidden />
            Add Party
          </Button>
        }
      />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="party-name-search">Search by name</Label>
          <Input
            id="party-name-search"
            type="search"
            value={nameSearch}
            placeholder="Search parties"
            onChange={(event) =>
              changeFilter(() => setNameSearch(event.target.value))
            }
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="party-type-filter">Party type</Label>
          <Select
            value={partyType}
            onValueChange={(value) =>
              changeFilter(() =>
                setPartyType(value as PartyType | typeof ALL_TYPES),
              )
            }
          >
            <SelectTrigger id="party-type-filter">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_TYPES}>All party types</SelectItem>
              {Object.values(PartyType).map((type) => (
                <SelectItem key={type} value={type}>
                  {partyTypeLabels[type]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {!isDepartmentStaff ? (
          <div className="space-y-2">
            <Label htmlFor="party-department-filter">Department</Label>
            <Select
              value={departmentId}
              onValueChange={(value) =>
                changeFilter(() => setDepartmentId(value))
              }
            >
              <SelectTrigger id="party-department-filter">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_DEPARTMENTS}>All departments</SelectItem>
                {departmentOptions.map((department) => (
                  <SelectItem key={department.id} value={department.id}>
                    {department.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : null}
      </div>
      <DataTable
        columns={columns}
        data={parties}
        getRowId={(party) => party.id}
        onRowClick={(party) => navigate(`/parties/${party.id}`)}
        pagination={{
          page: page,
          pageSize: PAGE_SIZE,
          total: totalRecords,
        }}
        onPageChange={setPage}
        emptyContent={
          <EmptyState
            icon={UsersRound}
            title="No parties found"
            description="Adjust the filters or add the first matching party."
          />
        }
      />
      <PartyFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        party={editingParty}
        departmentOptions={departmentOptions}
      />
    </PageContainer>
  );
}
