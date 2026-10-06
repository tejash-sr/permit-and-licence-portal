import { NextRequest, NextResponse } from "next/server";
import { getSession, unauthorized, serverError } from "@/lib/auth-helpers";
import { frappeGet, frappeCreate, frappeDelete } from "@/lib/frappe";

export async function GET(req: NextRequest) {
  const session = getSession(req, "admin");
  if (!session) return unauthorized();

  try {
    // Show ONLY role = "Officer" (excluding Admins)
    const data = await frappeGet("Officer", {
      filters: [["role", "=", "Officer"]],
      fields: ["name", "officer_id", "officer_name", "email", "agency", "department", "designation", "availability", "is_active"],
      limit: 200,
      order_by: "officer_name asc",
    });
    return NextResponse.json({ ok: true, data });
  } catch (err) {
    return serverError(err);
  }
}

export async function POST(req: NextRequest) {
  const session = getSession(req, "admin");
  if (!session) return unauthorized();

  try {
    const body = await req.json();
    const { officer_id, officer_name, email, agency, department, designation } = body;

    if (!officer_id || !officer_name || !email) {
      return NextResponse.json({ ok: false, error: "Officer ID, Name, and Email are required." }, { status: 400 });
    }

    const doc = await frappeCreate("Officer", {
      officer_id: officer_id.trim(),
      officer_name: officer_name.trim(),
      email: email.trim(),
      agency: agency || "",
      department: department || "",
      designation: designation || "",
      role: "Officer",
      availability: "Available",
      max_capacity: 10,
      current_load: 0,
      is_active: 1,
    });

    return NextResponse.json({ ok: true, data: doc });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message || "Failed to create officer" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const session = getSession(req, "admin");
  if (!session) return unauthorized();

  try {
    const { searchParams } = new URL(req.url);
    const name = searchParams.get("name");

    if (!name) {
      return NextResponse.json({ ok: false, error: "Officer document name is required." }, { status: 400 });
    }

    await frappeDelete("Officer", name);
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message || "Failed to delete officer" }, { status: 500 });
  }
}
