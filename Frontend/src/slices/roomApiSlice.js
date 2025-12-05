import { apiSlice } from "./apiSlice";

const roomApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    createRoom: builder.mutation({
      query: (data) => ({
        url: "/api/agora/token",
        method: "POST",
        body: data,
      }),
    }),
  }),
});

export const { useCreateRoomMutation } = roomApiSlice;
