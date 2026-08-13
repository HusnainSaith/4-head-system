import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DepartmentCode } from "@/types/enums";

const mockRecordPayment = vi.fn();
const mockGetBalances = vi.fn();

vi.mock("../partiesApi", () => ({
  useGetDepartmentBalancesQuery: (...args: unknown[]) =>
    mockGetBalances(...args),
  useRecordPartyPaymentMutation: () => [
    mockRecordPayment,
    { isLoading: false },
  ],
}));

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("@/features/accounts/components", () => ({ PaymentAccountFields: () => null }));

import { DepartmentBalancesPanel } from "./DepartmentBalancesPanel";

const balances = {
  success: true,
  data: {
    departmentId: "87598245-8efd-4b2c-b147-efb6c535abfe",
    totalPayable: "600.00",
    totalReceivable: "350.00",
    parties: [
      {
        partyId: "11111111-1111-4111-8111-111111111111",
        partyName: "Test Supplier",
        partyType: "farm",
        balance: "-600.00",
      },
      {
        partyId: "22222222-2222-4222-8222-222222222222",
        partyName: "Test Buyer",
        partyType: "buyer",
        balance: "350.00",
      },
    ],
  },
};

describe("DepartmentBalancesPanel", () => {
  beforeAll(() => {
    Object.defineProperties(HTMLElement.prototype, {
      hasPointerCapture: { value: () => false, configurable: true },
      setPointerCapture: { value: () => undefined, configurable: true },
      releasePointerCapture: { value: () => undefined, configurable: true },
      scrollIntoView: { value: () => undefined, configurable: true },
    });
  });

  beforeEach(() => {
    mockRecordPayment.mockReset();
    mockGetBalances.mockReset();
    mockGetBalances.mockReturnValue({
      data: balances,
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    });
  });

  it("requests only the selected department and displays payable and receivable totals", () => {
    render(<DepartmentBalancesPanel departmentCode={DepartmentCode.WASTAGE} />);

    expect(mockGetBalances).toHaveBeenCalledWith(DepartmentCode.WASTAGE);
    expect(screen.getByText("Total payable")).toBeInTheDocument();
    expect(screen.getByText("Total receivable")).toBeInTheDocument();
    expect(screen.getByText(/600/)).toBeInTheDocument();
    expect(screen.getByText(/350/)).toBeInTheDocument();
  });

  it("records a payment only against a payable party in this department", async () => {
    mockRecordPayment.mockReturnValue({
      unwrap: () => Promise.resolve({ success: true }),
    });
    const user = userEvent.setup();
    render(
      <DepartmentBalancesPanel departmentCode={DepartmentCode.BROKERAGE} />,
    );

    await user.click(screen.getByRole("button", { name: /record payment/i }));
    await user.click(screen.getAllByRole("combobox")[0]);
    await user.click(
      await screen.findByRole("option", { name: /test supplier/i }),
    );
    await user.type(screen.getByRole("spinbutton", { name: /amount/i }), "250");
    await user.click(screen.getByRole("button", { name: /^save$/i }));

    await waitFor(() => {
      expect(mockRecordPayment).toHaveBeenCalledWith({
        id: "11111111-1111-4111-8111-111111111111",
        body: expect.objectContaining({
          departmentId: "87598245-8efd-4b2c-b147-efb6c535abfe",
          amount: 250,
          direction: "paid",
        }),
      });
    });
  });

  it("records a receipt only against a receivable party in this department", async () => {
    mockRecordPayment.mockReturnValue({
      unwrap: () => Promise.resolve({ success: true }),
    });
    const user = userEvent.setup();
    render(<DepartmentBalancesPanel departmentCode={DepartmentCode.SUPPLY} />);

    await user.click(screen.getByRole("button", { name: /record receipt/i }));
    await user.click(screen.getAllByRole("combobox")[0]);
    await user.click(
      await screen.findByRole("option", { name: /test buyer/i }),
    );
    await user.type(screen.getByRole("spinbutton", { name: /amount/i }), "100");
    await user.click(screen.getByRole("button", { name: /^save$/i }));

    await waitFor(() => {
      expect(mockRecordPayment).toHaveBeenCalledWith({
        id: "22222222-2222-4222-8222-222222222222",
        body: expect.objectContaining({
          departmentId: "87598245-8efd-4b2c-b147-efb6c535abfe",
          amount: 100,
          direction: "received",
        }),
      });
    });
  });

  it("prevents an amount larger than the outstanding balance", async () => {
    const user = userEvent.setup();
    render(<DepartmentBalancesPanel departmentCode={DepartmentCode.WASTAGE} />);

    await user.click(screen.getByRole("button", { name: /record receipt/i }));
    await user.click(screen.getAllByRole("combobox")[0]);
    await user.click(
      await screen.findByRole("option", { name: /test buyer/i }),
    );
    await user.type(screen.getByRole("spinbutton", { name: /amount/i }), "351");
    await user.click(screen.getByRole("button", { name: /^save$/i }));

    const amountInput = screen.getByRole("spinbutton", { name: /amount/i });
    expect(amountInput).toHaveAttribute("max", "350");
    expect(amountInput).toBeInvalid();
    expect(mockRecordPayment).not.toHaveBeenCalled();
  });
});
