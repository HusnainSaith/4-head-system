export type InvoiceType =
  | "purchase"
  | "sale"
  | "transfer"
  | "payment"
  | "salary"
  | "expense"
  | "writeoff";
export type InvoiceStatus = "draft" | "posted" | "cancelled";

export interface InvoiceLineItem {
  description: string;
  qty: number;
  unit: string;
  rate: number;
  amount: number;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  invoiceType: InvoiceType;
  departmentId: string;
  department?: { id: string; name: string; type: string };
  sourceType: string;
  sourceId: string;
  partyId?: string;
  partyName?: string;
  party?: { id: string; name: string };
  lineItems: InvoiceLineItem[];
  subtotal: string;
  taxAmount: string;
  totalAmount: string;
  notes?: string;
  status: InvoiceStatus;
  issuedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface InvoiceQueryParams {
  page?: number;
  limit?: number;
  invoiceType?: InvoiceType;
  departmentId?: string;
  sourceType?: string;
  sourceId?: string;
  startDate?: string;
  endDate?: string;
}

export interface InvoicePage {
  items: Invoice[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
  };
}
