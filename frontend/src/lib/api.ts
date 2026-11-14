import { z } from "zod";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public code = "REQUEST_FAILED",
  ) {
    super(message);
  }
}

export function sessionToken() {
  let token = localStorage.getItem("roadsentinel-session");
  if (!token) {
    token = Array.from(crypto.getRandomValues(new Uint8Array(32)), (n) =>
      n.toString(16).padStart(2, "0"),
    ).join("");
    localStorage.setItem("roadsentinel-session", token);
  }
  return token;
}

export async function api<T>(
  path: string,
  schema: z.ZodType<T>,
  options: RequestInit = {},
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`/api/service/${path}`, {
      ...options,
      signal: options.signal ?? AbortSignal.timeout(55000),
      headers: {
        ...(options.body && !(options.body instanceof FormData)
          ? { "Content-Type": "application/json" }
          : {}),
        Authorization: `Bearer ${sessionToken()}`,
        ...options.headers,
      },
    });
  } catch {
    throw new ApiError(
      503,
      "The connection timed out or is unavailable. The free service may need about a minute to wake up. Please retry; check history before saving again.",
    );
  }
  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const parsed = z
      .object({ error: z.object({ message: z.string(), code: z.string() }) })
      .safeParse(body);
    throw new ApiError(
      response.status,
      parsed.success
        ? parsed.data.error.message
        : "The service could not complete this request.",
      parsed.success ? parsed.data.error.code : undefined,
    );
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success)
    throw new ApiError(
      502,
      "The backend response did not match the expected contract. Please try again after the deployment finishes.",
    );
  return parsed.data;
}

export function downloadText(
  filename: string,
  text: string,
  type = "text/plain",
) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
