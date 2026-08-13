import { apiSlice } from "@/store/apiSlice";
import type { ApiResponse } from "@/types/api";
import type {
  Notification,
  NotificationPage,
  NotificationQueryParams,
} from "./types";

export const notificationsApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getNotifications: builder.query<
      ApiResponse<NotificationPage>,
      NotificationQueryParams | void
    >({
      query: (params) => ({
        url: "/notifications",
        params: params || undefined,
      }),
      providesTags: (result) => [
        { type: "Notification", id: "LIST" },
        ...(result?.data.items.map(({ id }) => ({
          type: "Notification" as const,
          id,
        })) ?? []),
      ],
    }),
    getNotification: builder.query<ApiResponse<Notification>, string>({
      query: (id) => `/notifications/${id}`,
      providesTags: (_result, _error, id) => [{ type: "Notification", id }],
    }),
    retryNotification: builder.mutation<ApiResponse<Notification>, string>({
      query: (id) => ({ url: `/notifications/${id}/retry`, method: "POST" }),
      invalidatesTags: (_result, _error, id) => [
        { type: "Notification", id },
        { type: "Notification", id: "LIST" },
      ],
    }),
    resendNotification: builder.mutation<ApiResponse<Notification>, string>({
      query: (id) => ({
        url: `/notifications/${id}/resend`,
        method: "POST",
      }),
      invalidatesTags: (_result, _error, id) => [
        { type: "Notification", id },
        { type: "Notification", id: "LIST" },
      ],
    }),
    deleteNotification: builder.mutation<ApiResponse<null>, string>({
      query: (id) => ({ url: `/notifications/${id}`, method: "DELETE" }),
      invalidatesTags: (_result, _error, id) => [
        { type: "Notification", id },
        { type: "Notification", id: "LIST" },
      ],
    }),
  }),
});

export const {
  useGetNotificationsQuery,
  useGetNotificationQuery,
  useRetryNotificationMutation,
  useResendNotificationMutation,
  useDeleteNotificationMutation,
} = notificationsApi;
