/** Envelope added by the backend's global ResponseInterceptor. */
export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  timestamp: string;
}
