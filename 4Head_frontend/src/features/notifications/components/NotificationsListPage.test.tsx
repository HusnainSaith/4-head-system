import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { Role } from "@/types/enums";
import { NotificationsListPage } from "./NotificationsListPage";

const resend = vi.fn();
const remove = vi.fn();

vi.mock("react-redux", () => ({
  useSelector: (selector: (state: unknown) => unknown) =>
    selector({ auth: { user: { role: { name: Role.OWNER } } } }),
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock("../notificationsApi", () => ({
  useGetNotificationsQuery: () => ({
    data: {
      data: {
        items: [
          {
            id: "notification-1",
            type: "sale",
            title: "Sale Recorded",
            message: "A sale for Rs 25,000 was recorded successfully.",
            recipientEmail: "owner@example.com",
            sourceType: "sale",
            sourceId: "source-1",
            status: "sent",
            sentAt: "2026-07-14T10:00:00.000Z",
            createdAt: "2026-07-14T09:59:00.000Z",
            updatedAt: "2026-07-14T10:00:00.000Z",
            context: { amount: "25000" },
          },
        ],
        pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
      },
    },
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  }),
  useResendNotificationMutation: () => [resend, { isLoading: false }],
  useDeleteNotificationMutation: () => [remove, { isLoading: false }],
}));

describe("NotificationsListPage", () => {
  beforeEach(() => {
    resend.mockReset();
    remove.mockReset();
  });

  it("opens every notification row and displays its complete message", () => {
    render(
      <MemoryRouter>
        <NotificationsListPage />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByText("Sale Recorded"));
    const dialog = screen.getByRole("dialog");
    expect(
      within(dialog).getByText(
        "A sale for Rs 25,000 was recorded successfully.",
      ),
    ).toBeInTheDocument();
    expect(within(dialog).getByText("owner@example.com")).toBeInTheDocument();
    expect(within(dialog).getByText("25000")).toBeInTheDocument();
  });

  it("resends and soft-deletes from the row actions", async () => {
    resend.mockReturnValue({ unwrap: () => Promise.resolve({}) });
    remove.mockReturnValue({ unwrap: () => Promise.resolve({}) });
    render(
      <MemoryRouter>
        <NotificationsListPage />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole("button", { name: /resend/i }));
    await waitFor(() => expect(resend).toHaveBeenCalledWith("notification-1"));

    fireEvent.click(screen.getByRole("button", { name: /delete/i }));
    const confirm = screen.getByRole("alertdialog");
    fireEvent.click(within(confirm).getByRole("button", { name: "Delete" }));
    await waitFor(() => expect(remove).toHaveBeenCalledWith("notification-1"));
  });
});
