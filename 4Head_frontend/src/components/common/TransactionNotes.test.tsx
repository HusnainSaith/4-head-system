import { render, screen } from "@testing-library/react";
import { TransactionNotes } from "./TransactionNotes";

it.each([null, undefined, "", "  "])("shows a dash for absent notes (%s)", (notes) => {
  render(<TransactionNotes notes={notes} />);
  expect(screen.getByText("—")).toBeInTheDocument();
});

it("preserves multiline notes and renders markup as plain text", () => {
  const notes = "First line\n<script>alert('note')</script>";
  const { container } = render(<TransactionNotes notes={notes} />);
  expect(container.textContent).toBe(notes);
  expect(container.querySelector("script")).toBeNull();
  expect(container.firstChild).toHaveClass("whitespace-pre-wrap", "break-words");
});
