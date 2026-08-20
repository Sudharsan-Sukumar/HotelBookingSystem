/** Mirrors the backend's Common/Models/ApiResponse envelope exactly. */
export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  errors: string[];
}
