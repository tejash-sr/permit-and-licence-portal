import { NextRequest, NextResponse } from "next/server";
import { getSession, unauthorized, serverError } from "@/lib/auth-helpers";
import { frappeGet, frappeGetDoc } from "@/lib/frappe";

export async function GET(req: NextRequest) {
  const session = getSession(req, "citizen");
  if (!session) return unauthorized();

  try {
    const list = await frappeGet<{ name: string }>("Permit Type", {
      fields: ["name"],
      filters: [["is_active", "=", 1]],
      limit: 50,
    });

    const detailed = await Promise.all(
      list.map(async (t) => {
        const d = await frappeGetDoc<Record<string, any>>("Permit Type", t.name);
        if (!d) return null;
        return {
          name: d.name,
          permit_type_name: d.permit_type_name,
          application_type: d.application_type || (d.permit_type_name?.toLowerCase().includes("licence") ? "Licence" : "Permit"),
          renewal_behaviour: d.renewal_behaviour,
          requires_location: d.requires_location,
          requires_trade_licence: d.requires_trade_licence,
          validity_days: d.validity_days,
          auto_approval_threshold: d.auto_approval_threshold,
          ai_validation_hint: d.ai_validation_hint,
          required_documents: (d.required_documents || []).map((r: any) => ({
            document_name: r.document_name,
            doc_type_code: r.doc_type_code,
            is_mandatory: r.is_mandatory,
            applicable_stage: r.applicable_stage,
            applicable_agency: r.applicable_agency,
          })),
        };
      })
    );

    return NextResponse.json({ ok: true, data: detailed.filter(Boolean) });
  } catch (err) {
    return serverError(err);
  }
}
