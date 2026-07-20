import { createApi } from "@reduxjs/toolkit/query/react";
import type {
  CreateFeedbackDto,
  RespondFeedbackDto,
  UpdateFeedbackDto,
} from "../../schemas/feedback";
import { baseQueryWithAutoLogout } from "./baseQueryWithAutoLogout";

interface Feedback {
  id: string;
  clinicId: string;
  patientId: string;
  doctorId: string | null;
  appointmentId: string | null;
  rating: number;
  comments: string | null;
  attachments: string[] | null;
  isAnonymous: boolean;
  status: "new" | "reviewed" | "resolved" | string;
  tags: (string | TagObject)[] | null;
  response: string | null;
  responseBy: string | null;
  responseAt: string | null;
  createdAt: string;
  updatedAt: string;
}

interface TagObject {
  key: string;
  value: string;
}

interface FeedbackResponse {
  message: string;
  result: Feedback[];
}

interface FeedbackByIDResponse {
  message: string;
  result: Feedback;

}

interface CreateFeedbackResponse {
  message: string;
  result: {
    id: string;
  };
}

export const feedbackApi = createApi({
  reducerPath: "feedbackApi",
 baseQuery: baseQueryWithAutoLogout,
  tagTypes: ["Feedback"],
  endpoints: (builder) => ({
    // Get feedback by ID
    getFeedbackById: builder.query<FeedbackByIDResponse, string>({
      query: (feedbackId) => `/feedback/get-feedback/${feedbackId}`,
      providesTags: ["Feedback"],
    }),

    // Get all clinic's feedback
    getAllClinicsFeedback: builder.query<FeedbackResponse, void>({
      query: () => "/feedback/clinic/all",
      providesTags: ["Feedback"],
    }),

    // Get all user's feedback
    getAllUsersFeedback: builder.query<FeedbackResponse, void>({
      query: () => "/feedback/user/all",
      providesTags: ["Feedback"],
    }),

    // Create a feedback
    createFeedback: builder.mutation<CreateFeedbackResponse, CreateFeedbackDto & { captchaToken?: string }>(
      {
        query: (body) => ({
          url: "/feedback",
          method: "POST",
          body,
        }),
        invalidatesTags: ["Feedback"],
      }
    ),

    // Update a feedback
    updateFeedback: builder.mutation<
      CreateFeedbackResponse,
      { feedbackId: string; data: UpdateFeedbackDto }
    >({
      query: ({ feedbackId, data }) => ({
        url: `/feedback/update-feedback/${feedbackId}`,
        method: "PUT",
        body: data,
      }),
      invalidatesTags: ["Feedback"],
    }),

    // Update response feedback
    updateResponseFeedback: builder.mutation<
      { message: string },
      { feedbackId: string; data: RespondFeedbackDto }
    >({
      query: ({ feedbackId, data }) => ({
        url: `/feedback/respond/${feedbackId}`,
        method: "PUT",
        body: data,
      }),
      invalidatesTags: ["Feedback"],
    }),

    // Delete a feedback
    deleteFeedback: builder.mutation<void, string>({
      query: (feedbackId) => ({
        url: `/feedback/${feedbackId}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Feedback"],
    }),
  }),
});

export const {
  useGetFeedbackByIdQuery,
  useGetAllClinicsFeedbackQuery,
  useGetAllUsersFeedbackQuery,
  useCreateFeedbackMutation,
  useUpdateFeedbackMutation,
  useDeleteFeedbackMutation,
} = feedbackApi;
