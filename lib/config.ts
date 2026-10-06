function required(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(`Missing required env var: ${name}. Check .env.local and restart the dev server.`);
  }
  return value;
}

export const config = {
  erpBaseUrl: required("ERP_BASE_URL", process.env.ERP_BASE_URL),
  erpApiKey: required("ERP_API_KEY", process.env.ERP_API_KEY),
  erpApiSecret: required("ERP_API_SECRET", process.env.ERP_API_SECRET),
  activepiecesWebhookUrl: process.env.ACTIVEPIECES_WEBHOOK_URL || "",

  // Single WireMock instance, separate mapping files per role (see /wiremock/mappings)
  wiremockBaseUrl: required("WIREMOCK_BASE_URL", process.env.WIREMOCK_BASE_URL),

  // Demo OTP — every role uses the same fixed demo code so you can wire this up
  // against WireMock without a real SMS/email gateway. Swap generateOtp() in
  // lib/otp.ts for a real generator before going anywhere near production.
  demoOtp: process.env.DEMO_OTP || "1234",
  otpTtlSeconds: 300,

  sessionSecret: required("SESSION_SECRET", process.env.SESSION_SECRET),

  cookies: {
    citizen: "citizen_session",
    officer: "officer_session",
    admin: "admin_session",
  },
} as const;

export type PortalRole = "citizen" | "officer" | "admin";
