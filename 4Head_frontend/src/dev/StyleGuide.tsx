import { useState } from "react";
import { useForm } from "react-hook-form";
import { AlertCircle, Info } from "lucide-react";
import { toast } from "sonner";
import {
  ConfirmDialog,
  DataTable,
  type DataTableColumn,
  EmptyState,
  ErrorState,
  FormField,
  PageHeader,
  PageSkeleton,
  StatCard,
} from "@/components/common";
import {
  Alert,
  AlertDescription,
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
  AlertTitle,
  Avatar,
  AvatarFallback,
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  Checkbox,
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Form,
  Input,
  Label,
  RadioGroup,
  RadioGroupItem,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Separator,
  Skeleton,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Textarea,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui";

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3" aria-labelledby={`section-${title}`}>
      <div>
        <h2 id={`section-${title}`} className="text-lg font-semibold">
          {title}
        </h2>
        {description ? (
          <p className="text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>
      <div className="rounded-lg border bg-card p-4">{children}</div>
    </section>
  );
}

interface DemoUser {
  id: string;
  name: string;
  role: string;
  status: "Active" | "Suspended";
}

const demoUsers: DemoUser[] = [
  { id: "1", name: "Sam Rivera", role: "Owner", status: "Active" },
  { id: "2", name: "Noor Ahmed", role: "Accountant", status: "Active" },
  { id: "3", name: "Mina Shah", role: "Staff", status: "Suspended" },
];

const columns: DataTableColumn<DemoUser>[] = [
  { id: "name", header: "Name", enableSorting: true, cell: (row) => row.name },
  { id: "role", header: "Role", enableSorting: true, cell: (row) => row.role },
  {
    id: "status",
    header: "Status",
    cell: (row) => (
      <Badge variant={row.status === "Active" ? "success" : "warning"}>
        {row.status}
      </Badge>
    ),
  },
];

interface DemoFormValues {
  facilityName: string;
}

export function StyleGuide() {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [sort, setSort] = useState<{
    columnId: string | null;
    direction: "asc" | "desc" | null;
  }>({ columnId: null, direction: null });
  const form = useForm<DemoFormValues>({
    defaultValues: { facilityName: "North Farm" },
  });

  const sortedUsers = [...demoUsers].sort((first, second) => {
    if (!sort.columnId || !sort.direction) return 0;
    const direction = sort.direction === "asc" ? 1 : -1;
    return (
      first[sort.columnId as keyof DemoUser].localeCompare(
        second[sort.columnId as keyof DemoUser],
      ) * direction
    );
  });

  return (
    <main className="mx-auto max-w-6xl space-y-10 p-6">
      <PageHeader
        title="Component Library"
        description="The reusable visual vocabulary for every product screen."
        actions={<Badge variant="secondary">Development only</Badge>}
      />

      <Section
        title="Design tokens"
        description="Semantic colors and surfaces."
      >
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            ["Primary", "bg-primary"],
            ["Secondary", "bg-secondary"],
            ["Accent", "bg-accent"],
            ["Muted", "bg-muted"],
            ["Success", "bg-success"],
            ["Warning", "bg-warning"],
            ["Destructive", "bg-destructive"],
            ["Background", "bg-background"],
          ].map(([label, className]) => (
            <div key={label} className="space-y-2">
              <div className={`${className} h-12 rounded-md border`} />
              <p className="text-xs text-muted-foreground">{label}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section
        title="Buttons and badges"
        description="All supported variants and sizes."
      >
        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm">Small</Button>
          <Button>Default</Button>
          <Button size="lg">Large</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="destructive">Destructive</Button>
          <Button variant="outline">Outline</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="link">Link</Button>
          <Button isLoading>Loading</Button>
        </div>
        <Separator className="my-4" />
        <div className="flex flex-wrap gap-2">
          <Badge>Default</Badge>
          <Badge variant="secondary">Secondary</Badge>
          <Badge variant="success">Success</Badge>
          <Badge variant="warning">Warning</Badge>
          <Badge variant="destructive">Destructive</Badge>
          <Badge variant="outline">Outline</Badge>
        </div>
      </Section>

      <Section
        title="Form controls"
        description="Primitive and react-hook-form compositions."
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="guide-email">Email</Label>
            <Input
              id="guide-email"
              type="email"
              placeholder="name@example.com"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="guide-department">Department</Label>
            <Select defaultValue="supply">
              <SelectTrigger id="guide-department">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="supply">Supply</SelectItem>
                <SelectItem value="shop">Shop</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="guide-notes">Notes</Label>
            <Textarea id="guide-notes" placeholder="Add operational notes" />
          </div>
          <div className="flex items-center gap-2">
            <Checkbox id="guide-enabled" defaultChecked />
            <Label htmlFor="guide-enabled">Active record</Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch id="guide-alerts" defaultChecked />
            <Label htmlFor="guide-alerts">Notifications</Label>
          </div>
          <RadioGroup defaultValue="daily" className="flex gap-4">
            <div className="flex items-center gap-2">
              <RadioGroupItem value="daily" id="guide-daily" />
              <Label htmlFor="guide-daily">Daily</Label>
            </div>
            <div className="flex items-center gap-2">
              <RadioGroupItem value="weekly" id="guide-weekly" />
              <Label htmlFor="guide-weekly">Weekly</Label>
            </div>
          </RadioGroup>
          <Form {...form}>
            <FormField
              control={form.control}
              name="facilityName"
              label="Facility name"
              description="Composite field with shared help and error placement."
              required
            >
              {(field) => <Input {...field} />}
            </FormField>
          </Form>
        </div>
      </Section>

      <Section title="Cards, alerts, avatar, and tabs">
        <div className="grid gap-4 lg:grid-cols-2">
          <StatCard
            label="Current stock"
            value="1,240 kg"
            delta="Up 4%"
            trend="up"
          />
          <Card>
            <CardHeader>
              <CardTitle>Weekly revenue</CardTitle>
              <CardDescription>
                Compared with the previous week.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-2xl font-semibold">
              PKR 248,500
            </CardContent>
            <CardFooter>
              <Button variant="outline" size="sm">
                View report
              </Button>
            </CardFooter>
          </Card>
          <div className="space-y-3">
            <Alert>
              <Info className="h-4 w-4" />
              <AlertTitle>Information</AlertTitle>
              <AlertDescription>
                Inventory reconciliation is current.
              </AlertDescription>
            </Alert>
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Attention</AlertTitle>
              <AlertDescription>A record needs review.</AlertDescription>
            </Alert>
          </div>
        </div>
        <div className="mt-4 flex items-center gap-3">
          <Avatar>
            <AvatarFallback>NA</AvatarFallback>
          </Avatar>
          <Separator orientation="vertical" className="h-10" />
          <Tabs defaultValue="overview" className="flex-1">
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="activity">Activity</TabsTrigger>
            </TabsList>
            <TabsContent value="overview">Overview content</TabsContent>
            <TabsContent value="activity">Activity content</TabsContent>
          </Tabs>
        </div>
      </Section>

      <Section title="Overlays and feedback">
        <div className="flex flex-wrap gap-2">
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline">Dialog</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Edit record</DialogTitle>
                <DialogDescription>Standard modal content.</DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <DialogClose asChild>
                  <Button>Done</Button>
                </DialogClose>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline">Alert dialog</Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Continue?</AlertDialogTitle>
                <AlertDialogDescription>
                  Review the effect before continuing.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction>Continue</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          <Button variant="outline" onClick={() => setConfirmOpen(true)}>
            Confirm dialog
          </Button>
          <ConfirmDialog
            open={confirmOpen}
            onOpenChange={setConfirmOpen}
            title="Delete record?"
            description="This action cannot be undone."
            confirmLabel="Delete"
            destructive
            onConfirm={() => {
              setConfirmOpen(false);
              toast.success("Record deleted");
            }}
          />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">Dropdown</Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>Edit</DropdownMenuItem>
              <DropdownMenuItem>Duplicate</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost">Tooltip</Button>
            </TooltipTrigger>
            <TooltipContent>Helpful context</TooltipContent>
          </Tooltip>
          <Button
            variant="secondary"
            onClick={() => toast.success("Saved successfully")}
          >
            Toast
          </Button>
        </div>
      </Section>

      <Section
        title="Tables"
        description="Raw primitives and the shared sortable, paginated table."
      >
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Role</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {demoUsers.map((user) => (
              <TableRow key={user.id}>
                <TableCell>{user.name}</TableCell>
                <TableCell>{user.role}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <Separator className="my-5" />
        <DataTable
          columns={columns}
          data={sortedUsers}
          getRowId={(row) => row.id}
          sort={sort}
          onSortChange={setSort}
          pagination={{ page: 1, pageSize: 10, total: demoUsers.length }}
        />
      </Section>

      <Section title="Loading, empty, and error states">
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="space-y-2">
            <p className="text-xs font-medium">Loading</p>
            <PageSkeleton />
          </div>
          <EmptyState
            title="No records yet"
            description="Create the first record to get started."
            action={<Button size="sm">Create record</Button>}
          />
          <ErrorState
            title="Records unavailable"
            onRetry={() => toast("Retry requested")}
          />
        </div>
        <Separator className="my-5" />
        <Skeleton className="h-6 w-48" />
      </Section>
    </main>
  );
}
