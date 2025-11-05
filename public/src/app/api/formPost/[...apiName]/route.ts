import { NextRequest } from "next/server";
import { parseCookie } from "@/utils/helpers/cookie";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const { pathname } = request.nextUrl;
  // Strip the /api/formPost/ prefix
  const apiName = pathname.replace("/api/formPost/", "");
  const ROOT_URL = process.env.API_BASE_URL || "";
  const url = `${ROOT_URL}/${apiName}`.replace(/'/g, "");

  // Auth from cookie
  const cookieHeader = request.headers.get("cookie") || "";
  const parsedCookie = parseCookie(cookieHeader);
  const authToken = decodeURIComponent(parsedCookie?.auth_token ?? "");

  // Forward the incoming multipart body to the backend as-is
  const contentType = request.headers.get("content-type") || "";

  try {
    const init: (RequestInit & { duplex: "half" }) = {
      method: "POST",
      body: request.body as unknown as BodyInit,
      // Required by Node.js fetch when streaming a request body
      duplex: "half",
      headers: {
        ...(contentType && { "content-type": contentType }),
        ...(authToken && { Authorization: `Bearer ${authToken}` }),
        domainkey: process.env.DOMAIN_KEY ?? "",
      },
      cache: "no-store",
    };
    const upstream = await fetch(url, init);

    const data = await upstream.text();
    return new Response(data, {
      status: upstream.status,
      headers: { "Content-Type": upstream.headers.get("content-type") || "application/json" },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    return new Response(JSON.stringify({ message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
