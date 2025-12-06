import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

export const apiSlice = createApi({
  baseQuery: fetchBaseQuery({ baseUrl: "https://edure-recording-backend.onrender.com" }),
  tagTypes: [],
  endpoints: () => ({}),
});
