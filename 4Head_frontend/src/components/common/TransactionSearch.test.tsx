import { fireEvent, render, screen } from "@testing-library/react";
import {
  matchesTransactionSearch,
  TransactionSearch,
} from "./TransactionSearch";

it("provides an accessible search field and sends input to the page", () => {
  const onChange = vi.fn();
  render(<TransactionSearch value="" onChange={onChange} />);
  fireEvent.change(
    screen.getByRole("textbox", { name: "Search transactions" }),
    { target: { value: "farm" } },
  );
  expect(onChange).toHaveBeenCalledWith("farm");
});
it("matches party names, vehicle numbers, dates and notes without case sensitivity", () => {
  const row = {
    partyName: "Faheem Farm",
    vehicle: { registrationNumber: "ABC-123" },
    purchaseDate: "2026-10-04",
    notes: "Morning delivery",
  };
  for (const query of ["", "FAHEEM", "abc-123", "2026-10-04", "morning farm"])
    expect(matchesTransactionSearch(row, query)).toBe(true);
  expect(matchesTransactionSearch(row, "different customer")).toBe(false);
});
