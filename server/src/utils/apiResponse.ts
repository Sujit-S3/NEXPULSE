export interface SuccessResponse<T> {
  success: true;
  data: T;
  message?: string;
}

export function apiResponse<T>(data: T, message?: string): SuccessResponse<T> {
  const response: SuccessResponse<T> = { success: true, data };
  if (message) {
    response.message = message;
  }
  return response;
}
