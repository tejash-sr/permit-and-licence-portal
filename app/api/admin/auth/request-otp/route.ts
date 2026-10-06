import { NextRequest, NextResponse } from "next/server";
import { verifyAdminWithRegistry, sendOtpViaGateway } from "@/lib/wiremock";
import { generateOtp, saveOtp } from "@/lib/otp";
import { frappeGet } from "@/lib/frappe";
import { serverError } from "@/lib/auth-helpers";

export async function POST(req: NextRequest) {
  try {
    const { staff_id } = await req.json();
    if (!staff_id) return NextResponse.json({ ok: false, error: "Admin ID is required" }, { status: 400 });

    // Platform-admin registry check (WireMock, its own mapping file — never
    // shares data with the citizen ICA or officer HR mocks).
    const reg = await verifyAdminWithRegistry(staff_id);
    if (reg.status === 0) {
      return NextResponse.json({ ok: false, error: "Admin registry service is unreachable. Try again shortly." }, { status: 503 });
    }
    if (!reg.ok || !reg.data?.verified) {
      return NextResponse.json({ ok: false, error: "Admin ID not recognised." }, { status: 404 });
    }
    if (reg.data.role_status && reg.data.role_status !== "ACTIVE") {
      return NextResponse.json({ ok: false, error: `Admin account status is ${reg.data.role_status}, not ACTIVE.` }, { status: 403 });
    }

    // Make sure admin exists in ERPNext.
    const existing = await frappeGet<{ name: string; officer_name: string; email: string }>("Officer", {
      filters: [["officer_id", "=", staff_id], ["role", "=", "Admin"]],
      fields: ["name", "officer_name", "email"],
      limit: 1,
    });

    const admin = existing[0];
    if (!admin) {
      return NextResponse.json({ ok: false, error: "No matching Admin profile found." }, { status: 404 });
    }

    const otp = generateOtp();
    saveOtp("admin", staff_id, otp);
    await sendOtpViaGateway(admin.email, otp);

    return NextResponse.json({ ok: true, full_name: admin.officer_name });
  } catch (err) {
    return serverError(err);
  }
}
