import { fireEvent, render, screen } from "@testing-library/react";
import { DepartmentPaymentHistory } from "./DepartmentPaymentHistory";

const query = vi.fn();
vi.mock("../partiesApi", () => ({
  useListDepartmentPaymentsQuery: (...args: unknown[]) => query(...args),
}));

it("shows saved notes for both directions and requests the next page in the same department", () => {
  query.mockReturnValue({
    data: {
      data: {
        items: [
          {
            id: "1",
            partyName: "Supplier",
            paymentDate: "2026-09-29",
            direction: "paid",
            amount: "200",
            paymentMethod: "cash",
            notes: "Paid on account\nKeep receipt",
          },
          {
            id: "2",
            partyName: "Customer",
            paymentDate: "2026-09-30",
            direction: "received",
            amount: "100",
            paymentMethod: "bank",
            notes: "Customer's advance",
          },
        ],
        pagination: { total: 11 },
      },
    },
  });
  render(<DepartmentPaymentHistory departmentId="supply" />);
  expect(screen.getByText("Paid on account Keep receipt")).toBeInTheDocument();
  expect(screen.getByText("Customer's advance")).toBeInTheDocument();
  expect(screen.getByText("Payment paid")).toBeInTheDocument();
  expect(screen.getByText("Payment received")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Next" }));
  expect(query).toHaveBeenLastCalledWith(
    { departmentId: "supply", page: 2, limit: 10 },
    { skip: false },
  );
});

it("offers retry when the history fails to load", () => {
  const refetch = vi.fn();
  query.mockReturnValue({ isError: true, refetch });
  render(<DepartmentPaymentHistory departmentId="wastage" />);
  expect(
    screen.getByText("Payments and receipts could not be loaded."),
  ).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: /retry/i }));
  expect(refetch).toHaveBeenCalledOnce();
});

it.each(["supply", "brokerage", "wastage", "shop"])(
  "filters dates and resets pagination for %s",
  (departmentId) => {
    query.mockReturnValue({
      data: { data: { items: [], pagination: { total: 21 } } },
    });
    render(<DepartmentPaymentHistory departmentId={departmentId} />);
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    fireEvent.change(screen.getByLabelText("From"), {
      target: { value: "2026-09-01" },
    });
    expect(query).toHaveBeenLastCalledWith(
      { departmentId, page: 1, limit: 10, from: "2026-09-01" },
      { skip: false },
    );
    fireEvent.change(screen.getByLabelText("To"), {
      target: { value: "2026-09-30" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(query).toHaveBeenLastCalledWith(
      {
        departmentId,
        page: 2,
        limit: 10,
        from: "2026-09-01",
        to: "2026-09-30",
      },
      { skip: false },
    );
    fireEvent.click(screen.getByRole("button", { name: "Clear dates" }));
    expect(query).toHaveBeenLastCalledWith(
      { departmentId, page: 1, limit: 10 },
      { skip: false },
    );
  },
);
it("blocks reversed dates and supports an ending date alone", () => {
  query.mockReturnValue({
    data: { data: { items: [], pagination: { total: 0 } } },
  });
  render(<DepartmentPaymentHistory departmentId="supply" />);
  fireEvent.change(screen.getByLabelText("To"), {
    target: { value: "2026-09-01" },
  });
  expect(query).toHaveBeenLastCalledWith(
    { departmentId: "supply", page: 1, limit: 10, to: "2026-09-01" },
    { skip: false },
  );
  fireEvent.change(screen.getByLabelText("From"), {
    target: { value: "2026-09-30" },
  });
  expect(screen.getByRole("alert")).toHaveTextContent("Starting date");
  expect(query.mock.calls.at(-1)?.[1]).toEqual({ skip: true });
});
