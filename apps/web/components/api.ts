export class ApiError extends Error {
  constructor(
    message: string,
    public code: string,
  ) {
    super(message);
  }
}
export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`/api/v1/${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
    cache: "no-store",
  });
  const body = await response.json();
  if (!response.ok)
    throw new ApiError(
      body.message || "Không thể kết nối. Hãy thử lại.",
      body.code || "NETWORK_ERROR",
    );
  return body as T;
}
