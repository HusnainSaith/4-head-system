import { apiSlice } from "@/store/apiSlice";
import type {
  CommitteesResponse,
  CommitteeResponse,
  InstallmentsResponse,
  CreateCommitteeRequest,
  UpdateCommitteeRequest,
  CreateInstallmentRequest,
  CreatePayoutRequest,
} from "./types";

export const committeesApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    listCommittees: builder.query<CommitteesResponse, { departmentId?: string } | void>({
      query: (params) => ({
        url: "/committees",
        params: params ?? undefined,
      }),
      providesTags: (result) => [
        { type: "Committee", id: "LIST" },
        ...(result?.data?.map((committee) => ({
          type: "Committee" as const,
          id: committee.id,
        })) ?? []),
      ],
    }),

    getCommittee: builder.query<CommitteeResponse, string>({
      query: (id) => `/committees/${id}`,
      providesTags: (_result, _error, id) => [{ type: "Committee" as const, id }],
    }),

    createCommittee: builder.mutation<CommitteeResponse, CreateCommitteeRequest>({
      query: (body) => ({
        url: "/committees",
        method: "POST",
        body,
      }),
      invalidatesTags: [{ type: "Committee" as const, id: "LIST" }],
    }),

    updateCommittee: builder.mutation<
      CommitteeResponse,
      { id: string; body: UpdateCommitteeRequest }
    >({
      query: ({ id, body }) => ({
        url: `/committees/${id}`,
        method: "PATCH",
        body,
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: "Committee" as const, id },
        { type: "Committee" as const, id: "LIST" },
      ],
    }),

    getInstallments: builder.query<InstallmentsResponse, string>({
      query: (committeeId) => `/committees/${committeeId}/installments`,
      providesTags: (_result, _error, id) => [
        { type: "CommitteeInstallment" as const, id: `installments-${id}` },
      ],
    }),

    recordInstallment: builder.mutation<
      CommitteeResponse,
      { id: string; body: CreateInstallmentRequest }
    >({
      query: ({ id, body }) => ({
        url: `/committees/${id}/installments`,
        method: "POST",
        body,
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: "Committee" as const, id },
        { type: "Committee" as const, id: "LIST" },
        { type: "CommitteeInstallment" as const, id: `installments-${id}` },
      ],
    }),

    recordPayout: builder.mutation<
      CommitteeResponse,
      { id: string; body: CreatePayoutRequest }
    >({
      query: ({ id, body }) => ({
        url: `/committees/${id}/payout`,
        method: "POST",
        body,
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: "Committee" as const, id },
        { type: "Committee" as const, id: "LIST" },
      ],
    }),
  }),
});

export const {
  useListCommitteesQuery,
  useGetCommitteeQuery,
  useCreateCommitteeMutation,
  useUpdateCommitteeMutation,
  useGetInstallmentsQuery,
  useRecordInstallmentMutation,
  useRecordPayoutMutation,
} = committeesApi;
