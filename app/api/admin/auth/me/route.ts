import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth-helpers";

export async function GET(req: NextRequest) {
  const session = getSession(req, "admin");
  if (!session) return NextResponse.json({ authenticated: false });
  return NextResponse.json({
    authenticated: true,
    profile: { name: session.id, full_name: session.name, email: session.email },
  });
}
