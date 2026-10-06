import { NextRequest, NextResponse } from "next/server";
import { verifyOfficerWithRegistry, sendOtpViaGateway } from "@/lib/wiremock";
import { generateOtp, saveOtp } from "@/lib/otp";
import { frappeGet } from "@/lib/frappe";
import { serverError } from "@/lib/auth-helpers";

export async function POST(req: NextRequest) {
  try {
    const { staff_id } = await req.json();
    if (!staff_id) return NextResponse.json({ ok: false, error: "Officer ID is required" }, { status: 400 });

    // 1. Fetch Officer profile from ERPNext
    const matches = await frappeGet<{ name: string; officer_name: string; email: string; agency: string; is_active?: number }>("Officer", {
      filters: [["officer_id", "=", staff_id]],
      fields: ["name", "officer_name", "email", "agency", "is_active"],
      limit: 1,
    }).catch(() => []);
    
    const officer = matches[0];

    // 2. Agency HR registry check (WireMock).
    // If WireMock returns 404 (not found in static JSON), but the officer exists in ERPNext (created by Admin), allow fallback!
    const reg = await verifyOfficerWithRegistry(staff_id);
    
    if (reg.status === 0 && !officer) {
      return NextResponse.json({ ok: false, error: "Officer registry service is unreachable. Try again shortly." }, { status: 503 });
    }

    if ((!reg.ok || !reg.data?.verified) && !officer) {
      return NextResponse.json({ ok: false, error: "Officer ID not recognised by the agency registry or ERPNext." }, { status: 404 });
    }

    if (reg.data?.role_status && reg.data.role_status !== "ACTIVE") {
      return NextResponse.json({ ok: false, error: `Officer account status is ${reg.data.role_status}, not ACTIVE.` }, { status: 403 });
    }

    if (officer && officer.is_active === 0) {
      return NextResponse.json({ ok: false, error: "Officer account is deactivated in ERPNext." }, { status: 403 });
    }

    if (!officer) {
      return NextResponse.json({ ok: false, error: "No Officer Profile provisioned in ERPNext for this ID. Contact an administrator." }, { status: 404 });
    }

    const otp = generateOtp();
    saveOtp("officer", staff_id, otp, { full_name: officer.officer_name, email: officer.email });
    await sendOtpViaGateway(officer.email || staff_id, otp);

    return NextResponse.json({ ok: true, full_name: officer.officer_name, agency: officer.agency });
  } catch (err) {
    return serverError(err);
  }
}
