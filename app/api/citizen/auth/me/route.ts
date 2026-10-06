import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth-helpers";
import { frappeGet } from "@/lib/frappe";
import { verifyCitizenWithGovApi } from "@/lib/wiremock";

export async function GET(req: NextRequest) {
  const session = getSession(req, "citizen");
  if (!session) {
    return NextResponse.json({ authenticated: false });
  }

  try {
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

    return NextResponse.json({
      authenticated: true,
      profile: {
        full_name: session.name,
        email: session.email,
        phone: citizenDoc?.phone || icaData?.phone || "",
        emirates_id,
        nationality: icaData?.nationality || "",
        date_of_birth: icaData?.date_of_birth || "",
        gender: citizenDoc?.gender || icaData?.gender || "",
        card_expiry_date: icaData?.card_expiry_date || "",
      },
    });
  } catch (err) {
    // If ERP or ICA fails, fallback to basic session data
    return NextResponse.json({
      authenticated: true,
      profile: {
        full_name: session.name,
        email: session.email,
        phone: "",
        emirates_id: session.extra?.emirates_id,
        nationality: "",
        date_of_birth: "",
        gender: "",
        card_expiry_date: "",
      },
    });
  }
}
