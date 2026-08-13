import { useEffect, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { FormField } from "@/components/common/FormField";
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
import { Form } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  useCreatePartyMutation,
  useUpdatePartyMutation,
} from "@/features/parties/partiesApi";
import {
  PartyType,
  type CreatePartyRequest,
  type Party,
} from "@/features/parties/types";
import { getApiErrorMessage } from "@/lib/api-error";
import { useListPartyUsersQuery } from "@/features/users/usersApi";

const externalPartyTypes = [
  PartyType.FARM,
  PartyType.BROKER,
  PartyType.SHOP_OWNER,
  PartyType.CUSTOMER,
  PartyType.FACTORY,
  PartyType.RANDOM_USER,
  PartyType.INVESTOR,
] as const;

const optionalUuid = z.union([
  z.literal(""),
  z.string().uuid("Select a valid department"),
]);

const partyFormSchema = z.object({
  userId: optionalUuid,
  partyType: z.enum(externalPartyTypes),
  name: z.string().min(1, "Name is required").max(150),
  phone: z.string().max(30),
  address: z.string().max(255),
  primaryDepartmentId: optionalUuid,
  departmentIds: z
    .array(z.string().uuid())
    .min(1, "Select at least one linked department"),
  notes: z.string(),
  /**
   * Positive = party owes the business (receivable/asset).
   * Negative = business owes the party (payable/liability).
   */
  openingBalance: z
    .string()
    .refine(
      (v) => v === "" || Number.isFinite(Number(v)),
      "Must be a finite number",
    )
    .refine(
      (v) => v === "" || /^[-+]?(?:\d+)(?:\.\d{1,2})?$/.test(v),
      "Max 2 decimal places",
    ),
});

type PartyFormValues = z.infer<typeof partyFormSchema>;

export interface DepartmentOption {
  id: string;
  name: string;
}

interface PartyFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  party?: Party | null;
  departmentOptions: DepartmentOption[];
}

const partyTypeLabels: Record<PartyType, string> = {
  [PartyType.FARM]: "Farm",
  [PartyType.BROKER]: "Broker",
  [PartyType.SHOP_OWNER]: "Shop owner",
  [PartyType.CUSTOMER]: "Customer",
  [PartyType.FACTORY]: "Factory",
  [PartyType.INTERNAL_DEPARTMENT]: "Internal department",
  [PartyType.RANDOM_USER]: "Random user",
  [PartyType.INVESTOR]: "Investor",
};

function valuesFor(party?: Party | null): PartyFormValues {
  const partyType = externalPartyTypes.find(
    (candidate) => candidate === party?.partyType,
  );
  return {
    userId: party?.userId ?? "",
    partyType: partyType ?? PartyType.CUSTOMER,
    name: party?.name ?? "",
    phone: party?.phone ?? "",
    address: party?.address ?? "",
    primaryDepartmentId: party?.primaryDepartmentId ?? "",
    departmentIds:
      party?.departments?.map(({ id }) => id) ??
      [party?.primaryDepartmentId, party?.linkedDepartmentId].filter(
        (id): id is string => Boolean(id),
      ),
    notes: party?.notes ?? "",
    openingBalance: party ? String(party.openingBalance ?? "0") : "",
  };
}

function optional(value: string): string | undefined {
  return value === "" ? undefined : value;
}

function requestFrom(
  values: PartyFormValues,
  includeOpeningBalance: boolean,
): CreatePartyRequest {
  return {
    userId: optional(values.userId),
    partyType: values.partyType,
    name: values.name,
    phone: optional(values.phone),
    address: optional(values.address),
    primaryDepartmentId: optional(values.primaryDepartmentId),
    departmentIds: values.departmentIds,
    notes: optional(values.notes),
    ...(includeOpeningBalance && values.openingBalance !== ""
      ? { openingBalance: Number(values.openingBalance) }
      : {}),
  };
}

function applyServerFieldErrors(
  error: unknown,
  setError: ReturnType<typeof useForm<PartyFormValues>>["setError"],
): void {
  if (typeof error !== "object" || error === null) return;
  const result = error as Record<string, unknown>;
  if (typeof result.data !== "object" || result.data === null) return;
  const data = result.data as Record<string, unknown>;
  if (!Array.isArray(data.details)) return;

  const fields = new Set<keyof PartyFormValues>([
    "partyType",
    "userId",
    "name",
    "phone",
    "address",
    "primaryDepartmentId",
    "departmentIds",
    "notes",
    "openingBalance",
  ]);
  for (const detail of data.details) {
    if (typeof detail !== "string") continue;
    const separator = detail.indexOf(":");
    const field = detail.slice(0, separator) as keyof PartyFormValues;
    if (separator > 0 && fields.has(field)) {
      setError(field, {
        type: "server",
        message: detail.slice(separator + 1).trim(),
      });
    }
  }
}

export function PartyFormDialog({
  open,
  onOpenChange,
  party,
  departmentOptions,
}: PartyFormDialogProps) {
  const [createParty, createState] = useCreatePartyMutation();
  const [updateParty, updateState] = useUpdatePartyMutation();
  const form = useForm<PartyFormValues>({
    resolver: zodResolver(partyFormSchema),
    defaultValues: valuesFor(party),
  });
  const isEditing = Boolean(party);
  const isSubmitting = createState.isLoading || updateState.isLoading;
  const partyUsers = useListPartyUsersQuery();
  const [userSearch, setUserSearch] = useState("");
  const normalizedUserSearch = userSearch.trim().toLowerCase();
  const visiblePartyUsers = (partyUsers.data?.data ?? []).filter((user) =>
    [user.fullName, user.email, user.role?.name]
      .filter(Boolean)
      .some((value) =>
        String(value).toLowerCase().includes(normalizedUserSearch),
      ),
  );

  useEffect(() => {
    if (open) {
      form.reset(valuesFor(party));
    }
  }, [form, open, party]);

  const onSubmit = async (values: PartyFormValues) => {
    form.clearErrors("root");
    if (!party && !values.userId) {
      form.setError("userId", {
        type: "manual",
        message: "Select a user with a party role",
      });
      return;
    }
    try {
      const body = requestFrom(values, !party);
      if (party) {
        await updateParty({ id: party.id, body }).unwrap();
      } else {
        await createParty(body).unwrap();
      }
      toast.success(isEditing ? "Party updated" : "Party created");
      onOpenChange(false);
    } catch (error) {
      applyServerFieldErrors(error, form.setError);
      const message = getApiErrorMessage(error);
      form.setError("root.server", { type: "server", message });
      toast.error(message);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit party" : "Add party"}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update the party details accepted by the backend."
              : "Create an external party for purchasing, sales, or payments."}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            className="space-y-4"
            onSubmit={form.handleSubmit(onSubmit)}
            noValidate
          >
            {form.formState.errors.root?.server?.message ? (
              <Alert variant="destructive">
                <AlertDescription>
                  {form.formState.errors.root.server.message}
                </AlertDescription>
              </Alert>
            ) : null}
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="userId"
                label="Party user"
                required={!isEditing}
                description="Search active users assigned to PARTY, FARM, BROKER, SHOP_OWNER, CUSTOMER, FACTORY, RANDOM_USER, or INVESTOR roles."
              >
                {(field) => (
                  <div className="space-y-2">
                    <Input
                      aria-label="Search party users"
                      placeholder="Search by name, email, or role"
                      value={userSearch}
                      onChange={(event) => setUserSearch(event.target.value)}
                    />
                    <Select
                      value={field.value}
                      onValueChange={(value) => {
                        field.onChange(value);
                        const user = partyUsers.data?.data.find(
                          (candidate) => candidate.id === value,
                        );
                        if (user) {
                          form.setValue("name", user.fullName, {
                            shouldValidate: true,
                          });
                          form.setValue("phone", user.phone ?? "");
                          if (user.role?.name.toLowerCase() === "investor") {
                            form.setValue("partyType", PartyType.INVESTOR, {
                              shouldValidate: true,
                            });
                          }
                        }
                      }}
                    >
                      <SelectTrigger aria-label="Party user">
                        <SelectValue placeholder="Select party user" />
                      </SelectTrigger>
                      <SelectContent>
                        {visiblePartyUsers.map((user) => (
                          <SelectItem key={user.id} value={user.id}>
                            {user.fullName} ({user.role?.name ?? "party"})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </FormField>
              <FormField
                control={form.control}
                name="name"
                label="Name"
                required
              >
                {(field) => <Input {...field} autoComplete="organization" />}
              </FormField>
              <FormField
                control={form.control}
                name="partyType"
                label="Party type"
                required
              >
                {(field) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a party type" />
                    </SelectTrigger>
                    <SelectContent>
                      {externalPartyTypes.map((type) => (
                        <SelectItem key={type} value={type}>
                          {partyTypeLabels[type]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </FormField>
              <FormField control={form.control} name="phone" label="Phone">
                {(field) => <Input {...field} type="tel" autoComplete="tel" />}
              </FormField>
              <FormField control={form.control} name="address" label="Address">
                {(field) => <Input {...field} autoComplete="street-address" />}
              </FormField>
              <DepartmentField
                control={form.control}
                name="primaryDepartmentId"
                label="Primary department"
                options={departmentOptions}
              />
              <div className="sm:col-span-2">
                <FormField
                  control={form.control}
                  name="departmentIds"
                  label="Linked departments"
                  required
                  description="Select every department allowed to transact with this party."
                >
                  {(field) => (
                    <div className="grid gap-2 rounded-md border p-3 sm:grid-cols-2">
                      {departmentOptions.map((option) => (
                        <label
                          key={option.id}
                          className="flex cursor-pointer items-center gap-2 rounded p-2 hover:bg-muted"
                        >
                          <Checkbox
                            checked={field.value.includes(option.id)}
                            onCheckedChange={(checked) => {
                              const values = checked
                                ? [...field.value, option.id]
                                : field.value.filter((id) => id !== option.id);
                              field.onChange(values);
                              if (
                                checked &&
                                !form.getValues("primaryDepartmentId")
                              ) {
                                form.setValue("primaryDepartmentId", option.id);
                              }
                            }}
                          />
                          <span>{option.name}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </FormField>
              </div>
              {!isEditing ? (
                <FormField
                  control={form.control}
                  name="openingBalance"
                  label="Opening balance"
                  description="Positive = party owes the business (receivable). Negative = business owes the party (payable)."
                >
                  {(field) => (
                    <Input
                      {...field}
                      type="number"
                      step="0.01"
                      placeholder="0"
                    />
                  )}
                </FormField>
              ) : null}
            </div>
            <FormField control={form.control} name="notes" label="Notes">
              {(field) => <Textarea {...field} />}
            </FormField>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" isLoading={isSubmitting}>
                {isEditing ? "Save changes" : "Create party"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

function DepartmentField({
  control,
  name,
  label,
  options,
}: {
  control: ReturnType<typeof useForm<PartyFormValues>>["control"];
  name: "primaryDepartmentId";
  label: string;
  options: DepartmentOption[];
}) {
  return (
    <FormField control={control} name={name} label={label}>
      {(field) => (
        <Select
          value={field.value || "none"}
          onValueChange={(value) =>
            field.onChange(value === "none" ? "" : value)
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="No department" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">No department</SelectItem>
            {options.map((option) => (
              <SelectItem key={option.id} value={option.id}>
                {option.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </FormField>
  );
}
