import { NextRequest } from "next/server";

export const maxDuration = 60;
const allowed =
  /^(health|model\/metadata|metrics|activity|predictions(?:\/[a-f0-9-]+)?|predict(?:\/whatif|\/speed-sweep|\/batch)?|batch\/preview|explain\/(?:local|global)|insights\/(?:overview|states|export|crashes)|hotspots)$/;

async function proxy(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  const { path } = await context.params;
  const resource = path.join("/");
  if (!allowed.test(resource))
    return Response.json(
      { error: { code: "NOT_FOUND", message: "Unknown service route." } },
      { status: 404 },
    );
  const base =
    process.env.NEXT_PUBLIC_API_URL ||
    process.env.NEXT_PUBLIC_BACKEND_URL ||
    (process.env.NODE_ENV === "development" ? "http://localhost:8000" : "");
  if (!base)
    return Response.json(
      {
        error: {
          code: "BACKEND_UNCONFIGURED",
          message:
            "The backend URL has not been configured for this deployment.",
        },
      },
      { status: 503 },
    );
  const size = Number(request.headers.get("content-length") || 0);
  if (!Number.isFinite(size) || size > 2162688)
    return Response.json(
      {
        error: {
          code: "UPLOAD_TOO_LARGE",
          message: "Upload a CSV smaller than 2 MiB.",
        },
      },
      { status: 413 },
    );
  try {
    const target = new URL(`${base.replace(/\/$/, "")}/${resource}`);
    target.search = request.nextUrl.search;
    const headers = new Headers();
    for (const name of ["content-type", "authorization"]) {
      const value = request.headers.get(name);
      if (value) headers.set(name, value);
    }
    const body =
      request.method === "GET" || request.method === "DELETE"
        ? undefined
        : await request.arrayBuffer();
    if (body && body.byteLength > 2162688)
      return Response.json(
        {
          error: { code: "UPLOAD_TOO_LARGE", message: "Request is too large." },
        },
        { status: 413 },
      );
    const response = await fetch(target, {
      method: request.method,
      headers,
      body,
      redirect: "error",
      cache: "no-store",
      signal: AbortSignal.timeout(53000),
    });
    return new Response(response.body, {
      status: response.status,
      headers: {
        "Content-Type":
          response.headers.get("content-type") || "application/json",
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
        ...(response.headers.has("retry-after")
          ? { "Retry-After": response.headers.get("retry-after")! }
          : {}),
      },
    });
  } catch {
    return Response.json(
      {
        error: {
          code: "BACKEND_UNAVAILABLE",
          message:
            "The free backend may be waking up. Wait about a minute, then retry. Indian aggregate data will appear when the service is ready.",
        },
      },
      { status: 503 },
    );
  }
}
export { proxy as GET, proxy as POST, proxy as DELETE };
