// Extracts the API's standard error message, falling back to the network error.
export const errorMessage = (error) =>
  error?.response?.data?.error?.message ?? error?.message ?? 'Something went wrong.';
