import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

export const apiSlice = createApi({
  baseQuery: fetchBaseQuery({ baseUrl: "http://localhost:4000" }),  // https://edure-recording-backend.onrender.com
  tagTypes: [],
  endpoints: () => ({}),
});
