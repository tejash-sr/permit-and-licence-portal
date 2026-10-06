import { NextRequest, NextResponse } from "next/server";
import { getSession, unauthorized } from "@/lib/auth-helpers";
import { config } from "@/lib/config";
import { frappeGet, frappeGetDoc } from "@/lib/frappe";
import { verifyCitizenWithGovApi } from "@/lib/wiremock";

const MAX_FILE_SIZE_BYTES = 2 * 1024 * 1024; // 2 MB, matches client-side limit

function base64ByteSize(base64: string): number {
  const clean = base64.includes(",") ? base64.split(",")[1] : base64;
  const len = clean.length;
  const padding = clean.endsWith("==") ? 2 : clean.endsWith("=") ? 1 : 0;
  return (len * 3) / 4 - padding;
}

export async function POST(req: NextRequest) {
  const session = getSession(req, "citizen");
  if (!session) return unauthorized();

  try {
    const body = await req.json();
    const fileData: Record<string, string> = body?.files ?? {};
    const oversized: { code: string; sizeMB: string }[] = [];

    const processedFiles: Record<string, string> = {};
    for (const [code, base64] of Object.entries(fileData)) {
      if (typeof base64 !== "string") continue;
      const sizeBytes = base64ByteSize(base64);
      if (sizeBytes > MAX_FILE_SIZE_BYTES) {
        oversized.push({ code, sizeMB: (sizeBytes / (1024 * 1024)).toFixed(2) });
      }
      processedFiles[code] = base64.includes(",") ? base64.split(",")[1] : base64;
    }
    
    if (oversized.length) {
      return NextResponse.json({ ok: false, error: "File size limit exceeded (2MB max)", details: oversized }, { status: 413 });
    }

    if (!config.activepiecesWebhookUrl) {
      return NextResponse.json({ ok: false, error: "Submission pipeline not configured (ACTIVEPIECES_WEBHOOK_URL missing)" }, { status: 500 });
    }

    // 1. Get Citizen details
    const existing = await frappeGet<{ phone: string; gender: string }>("Citizen", {
      filters: [["name", "=", session.id]],
      fields: ["phone", "gender"],
      limit: 1,
    });
    
    const citizenDoc = existing[0];
    const emirates_id = session.extra?.emirates_id as string;
    let icaData = null;
    
    if (emirates_id && citizenDoc?.phone) {
      const ica = await verifyCitizenWithGovApi(emirates_id, citizenDoc.phone);
      if (ica.ok && ica.data?.verified) {
        icaData = ica.data;
      }
    }

    const applicant_phone = citizenDoc?.phone || icaData?.phone || "";
    const applicant_email = session.email;

    // 2. Build stages array from Permit Type
    const permitTypeDoc = await frappeGetDoc<any>("Permit Type", body.permit_type);
    if (!permitTypeDoc) {
       return NextResponse.json({ ok: false, error: "Invalid Permit Type" }, { status: 400 });
    }

    const stages = (permitTypeDoc.required_documents || []).map((doc: any) => ({
      document_name: doc.document_name,
      doc_type_code: doc.doc_type_code,
      is_mandatory: doc.is_mandatory,
      status: "Pending"
    }));

    const finalPayload = {
      ...body,
      applicant: session.id, // ID
      applicant_name: session.name, // Full Name
      applicant_email,
      applicant_phone,
      permit_type_name: permitTypeDoc.permit_type_name,
      language_preference: "English",
      stages,
      files: processedFiles
    };

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 25000);

    const res = await fetch(config.activepiecesWebhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(finalPayload),
      signal: controller.signal,
    }).finally(() => clearTimeout(timeout));

    const data = await res.json().catch(() => null);
    if (!res.ok) {
      return NextResponse.json({ ok: false, status: res.status, error: data ?? "Activepieces returned an error" }, { status: res.status });
    }

    const permitId = data?.permitId ?? null;
    return NextResponse.json({ ok: !!permitId && !!data?.allOk, permitId, uploads: data?.uploads ?? [], allOk: data?.allOk ?? false });
  } catch (e) {
    const isTimeout = e instanceof Error && e.name === "AbortError";
    return NextResponse.json({ ok: false, error: isTimeout ? "Submission timed out. Try again." : String(e) }, { status: 500 });
  }
}
