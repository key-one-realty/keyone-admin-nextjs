import { NextRequest } from "next/server";
import axios,{ AxiosError } from "axios";
import { parseCookie } from "@/utils/helpers/cookie";

export async function GET(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const apiName = pathname.replace("/api/get/", "");
  const ROOT_URL = process.env.API_BASE_URL;
  // Preserve original query string for pagination & filters
  const url = `${ROOT_URL}/${apiName}${search}`.replace(/'/g, "");

  const cookieHeader = request.headers.get("cookie") || "";
  const parsedCookie = parseCookie(cookieHeader);
  const authToken = decodeURIComponent(parsedCookie?.auth_token ?? "");

  try {
    const response = await axios({
      url,
      method: "GET",
      headers: {
        ...(authToken && { Authorization: `Bearer ${authToken}` }),
        domainkey: process.env.DOMAIN_KEY ?? "",
      },
    });

    return new Response(JSON.stringify(response.data), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    const err = error as AxiosError;
    console.error("API Error:", {
      message: err.message,
      code: err.code,
      url: url,
      statusCode: err.response?.status,
      responseData: err.response?.data,
    });

    const statusCode = err.response?.status || 500;
    const responseData = err.response?.data || {
      message: err.message || "Internal Server Error",
    };

    return new Response(JSON.stringify(responseData), {
      status: statusCode,
      headers: { "Content-Type": "application/json" },
    });
  }
}