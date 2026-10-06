// Thin client for the WireMock instance that stands in for real government /
// HR registries during the demo. One WireMock server, three mapping files
// (see /wiremock/mappings): citizen ICA lookup, officer registry, admin registry.
import { config } from "./config";

async function post<T>(path: string, body: unknown): Promise<{ ok: boolean; status: number; data: T | null }> {
  try {
    const res = await fetch(`${config.wiremockBaseUrl}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
    });
    const data = await res.json().catch(() => null);
    return { ok: res.ok, status: res.status, data };
  } catch (e) {
    // WireMock unreachable — never let this crash the route, surface as a clean failure.
    return { ok: false, status: 0, data: null };
  }
}

export type IcaVerifyResponse = {
  verified: boolean;
  emirates_id?: string;
  full_name?: string;
  email?: string;
  nationality?: string;
  date_of_birth?: string;
  gender?: string;
  card_expiry_date?: string;
  id_status?: "ACTIVE" | "EXPIRED" | "SUSPENDED";
  phone?: string;
};

/** Citizen: checks Emirates ID + phone against the mock ICA registry. */
export function verifyCitizenWithGovApi(emiratesId: string, phone: string) {
  return post<IcaVerifyResponse>("/gov/ica/verify", { emirates_id: emiratesId, phone });
}

export type StaffVerifyResponse = {
  verified: boolean;
  staff_id?: string;
  full_name?: string;
  email?: string;
  agency?: string;
  department?: string;
  designation?: string;
  role_status?: "ACTIVE" | "SUSPENDED";
};

/** Officer: checks Officer/Staff ID against the mock agency HR registry. */
export function verifyOfficerWithRegistry(staffId: string) {
  return post<StaffVerifyResponse>("/gov/officer-registry/verify", { staff_id: staffId });
}

/** Admin: checks Admin ID against the mock platform-admin registry. */
export function verifyAdminWithRegistry(staffId: string) {
  return post<StaffVerifyResponse>("/gov/admin-registry/verify", { staff_id: staffId });
}

/** Fire-and-forget OTP "send" — WireMock just echoes success; UI always uses the demo code. */
export function sendOtpViaGateway(destination: string, otp: string) {
  return post<{ sent: boolean }>("/otp/send", { destination, otp });
}
