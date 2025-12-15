import { apiSlice } from "./apiSlice";

export const roomApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    // ===============================
    // 1. Tutor Creates Class
    // ===============================
    createClass: builder.mutation({
      query: (data) => ({
        url: "/api/class/create",
        method: "POST",
        body: data,
      }),
    }),

    // ===============================
    // 2. Student Sends Join Request
    // ===============================
    requestJoin: builder.mutation({
      query: (data) => ({
        url: "/api/class/request-join",
        method: "POST",
        body: data,
      }),
    }),

    // ===============================
    // 3. Tutor Approves Student
    // ===============================
    approveStudent: builder.mutation({
      query: (data) => ({
        url: "/api/class/approve",
        method: "POST",
        body: data,
      }),
    }),

    // ===============================
    // 4. Check Student Approval
    // ===============================
    checkApproval: builder.mutation({
      query: ({ roomId, studentId }) => ({
        url: `/api/class/check/${roomId}/${studentId}`,
        method: "GET",
      }),
    }),

    // ===============================
    // 5. Generate Agora Token
    // ===============================
    generateRoomToken: builder.mutation({
      query: (data) => ({
        url: "/api/agora/token",
        method: "POST",
        body: data,
      }),
    }),

    startRecording: builder.mutation({
      query: (data) => ({
        url: "/api/recording/start",
        method: "POST",
        body: data,
      }),
    }),

    stopRecording: builder.mutation({
      query: (data) => ({
        url: "/api/recording/stop",
        method: "POST",
        body: data,
      }),
    }),
  }),
});

export const {
  useCreateClassMutation,
  useRequestJoinMutation,
  useApproveStudentMutation,
  useCheckApprovalMutation,
  useGenerateRoomTokenMutation,
  useStartRecordingMutation,
  useStopRecordingMutation
} = roomApiSlice;
