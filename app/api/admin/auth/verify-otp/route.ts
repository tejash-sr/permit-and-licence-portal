import { NextRequest, NextResponse } from "next/server";
import { verifyOtp } from "@/lib/otp";
import { frappeGet } from "@/lib/frappe";
import { createSessionToken, setSessionCookie } from "@/lib/session";
import { serverError } from "@/lib/auth-helpers";

const OTP_ERROR_MESSAGES: Record<string, string> = {
  expired: "That code expired. Request a new one.",
  invalid: "Incorrect code. Please try again.",
  too_many_attempts: "Too many incorrect attempts. Request a new code.",
  not_found: "No pending code for this ID. Request a new one.",
};

export async function POST(req: NextRequest) {
  try {
    const { staff_id, otp } = await req.json();
    if (!staff_id || !otp) return NextResponse.json({ ok: false, error: "Admin ID and code are required" }, { status: 400 });

    const result = verifyOtp("admin", staff_id, otp);
    if (result.status !== "ok") return NextResponse.json({ ok: false, error: OTP_ERROR_MESSAGES[result.status] }, { status: 401 });

    const matches = await frappeGet<{ name: string; officer_name: string; email: string }>("Officer", {
      filters: [["officer_id", "=", staff_id], ["role", "=", "Admin"]],
      fields: ["name", "officer_name", "email"],
      limit: 1,
    });
    const admin = matches[0];
    if (!admin) return NextResponse.json({ ok: false, error: "Admin profile not found." }, { status: 404 });

    const token = createSessionToken({
      role: "admin",
      id: admin.name,
      name: admin.officer_name,
      email: admin.email ?? "",
      extra: { staff_id },
    });

    const res = NextResponse.json({ ok: true, full_name: admin.officer_name });
    setSessionCookie(res, "admin", token);
    return res;
  } catch (err) {
    return serverError(err);
  }
}
