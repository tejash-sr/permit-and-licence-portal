import { NextRequest, NextResponse } from "next/server";
import { getSession, unauthorized, serverError } from "@/lib/auth-helpers";
import { frappeGet, frappeUpdate } from "@/lib/frappe";

export async function GET(req: NextRequest) {
  const session = getSession(req, "officer");
  if (!session) return unauthorized();

  try {
    const matches = await frappeGet<{ name: string; availability: string }>("Officer", {
      filters: [["officer_id", "=", session.id]],
      fields: ["name", "availability"],
      limit: 1,
    });

    const officer = matches[0];
    if (!officer) {
      return NextResponse.json({ ok: false, error: "Officer not found" }, { status: 404 });
    }

    return NextResponse.json({ ok: true, availability: officer.availability || "Available" });
  } catch (err) {
    return serverError(err);
  }
}

export async function POST(req: NextRequest) {
  const session = getSession(req, "officer");
  if (!session) return unauthorized();

  try {
    const { availability } = await req.json();
    if (!["Available", "Busy", "Offline"].includes(availability)) {
      return NextResponse.json({ ok: false, error: "Invalid availability status." }, { status: 400 });
    }

    const matches = await frappeGet<{ name: string }>("Officer", {
      filters: [["officer_id", "=", session.id]],
      fields: ["name"],
      limit: 1,
    });

    const officer = matches[0];
    if (!officer) {
      return NextResponse.json({ ok: false, error: "Officer profile not found in ERPNext" }, { status: 404 });
    }

    await frappeUpdate("Officer", officer.name, { availability });
    return NextResponse.json({ ok: true, availability });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message || "Failed to update availability" }, { status: 500 });
  }
}
