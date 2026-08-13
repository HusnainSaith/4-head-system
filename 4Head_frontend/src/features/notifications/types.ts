export type NotificationStatus = "pending" | "sent" | "failed";

export interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  recipientEmail?: string;
  recipientUserId?: string;
  recipientUser?: { id: string; fullName: string; email: string };
  sourceType: string;
  sourceId: string;
  status: NotificationStatus;
  errorMessage?: string;
  sentAt?: string;
  context?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationQueryParams {
  page?: number;
  limit?: number;
  status?: NotificationStatus;
  sourceType?: string;
  recipientUserId?: string;
}

export interface NotificationPage {
  items: Notification[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
  };
}
