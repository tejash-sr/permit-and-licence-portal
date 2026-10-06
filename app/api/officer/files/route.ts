import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth-helpers";
import { config } from "@/lib/config";

export async function GET(req: NextRequest) {
  const session = getSession(req, "officer");
  if (!session) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const fileUrl = searchParams.get("url");

  if (!fileUrl) {
    return new NextResponse("Missing file url", { status: 400 });
  }

  try {
    const baseUrl = config.erpBaseUrl.endsWith("/") ? config.erpBaseUrl.slice(0, -1) : config.erpBaseUrl;
    const isAbsolute = fileUrl.startsWith("http://") || fileUrl.startsWith("https://");
    const targetUrl = isAbsolute ? fileUrl : `${baseUrl}${fileUrl}`;

    console.log("Proxying private file request to ERPNext:", targetUrl);

    const res = await fetch(targetUrl, {
      headers: {
        Authorization: `token ${config.erpApiKey}:${config.erpApiSecret}`,
      },
    });

    if (!res.ok) {
      console.error(`Failed to fetch file from ERPNext: ${res.status} ${res.statusText}`);
      return new NextResponse("Failed to retrieve file from storage", { status: res.status });
    }

    const contentType = res.headers.get("content-type") || "application/pdf";
    const buffer = await res.arrayBuffer();

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `inline; filename="${fileUrl.split("/").pop()}"`,
      },
    });
  } catch (err: any) {
    console.error("Proxy file error:", err);
    return new NextResponse(err.message || "Internal server error", { status: 500 });
  }
}
