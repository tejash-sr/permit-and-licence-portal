// In-app stand-in for WireMock. Serves the same /wiremock/mappings/*.json files,
// so switching between this and a real WireMock server is one line in .env.local:
//   WIREMOCK_BASE_URL=http://localhost:3000/api/mock   (this route)
//   WIREMOCK_BASE_URL=http://localhost:8080            (WireMock)
// Only supports what the mappings use today: method + urlPath matching, simple
// `$[?(@.field == 'value')]` body patterns, priority, and jsonBody/body responses.
import { NextRequest, NextResponse } from "next/server";
import { readdir, readFile } from "fs/promises";
import path from "path";

const MAPPINGS_DIR = path.join(process.cwd(), "wiremock", "mappings");

type Mapping = {
  priority?: number;
  request: {
    method?: string;
    urlPath?: string;
    bodyPatterns?: { matchesJsonPath?: string }[];
  };
  response: {
    status?: number;
    headers?: Record<string, string>;
    jsonBody?: unknown;
    body?: string;
  };
};

// Read on every request so edits to the mapping files apply without a restart.
async function loadMappings(): Promise<Mapping[]> {
  const files = (await readdir(MAPPINGS_DIR)).filter((f) => f.endsWith(".json"));
  const mappings = await Promise.all(
    files.map(async (f) => JSON.parse(await readFile(path.join(MAPPINGS_DIR, f), "utf8")) as Mapping)
  );
  // WireMock: lower number = higher priority, default 5.
  return mappings.sort((a, b) => (a.priority ?? 5) - (b.priority ?? 5));
}

const SIMPLE_JSON_PATH = /^\$\[\?\(@\.(\w+)\s*==\s*'([^']*)'\)\]$/;

function bodyMatches(pattern: { matchesJsonPath?: string }, body: Record<string, unknown> | null): boolean {
  const m = pattern.matchesJsonPath?.match(SIMPLE_JSON_PATH);
  if (!m) return false; // unsupported pattern — never match rather than guess
  const [, field, value] = m;
  return body !== null && String(body[field]) === value;
}

async function handle(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  if (process.env.NODE_ENV === "production" && process.env.MOCK_API_ENABLED !== "true") {
    return NextResponse.json({ error: "Mock API disabled" }, { status: 404 });
  }

  const urlPath = "/" + (await params).path.join("/");
  const raw = await req.text();
  let body: Record<string, unknown> | null = null;
  try {
    body = raw ? JSON.parse(raw) : null;
  } catch {
    body = null;
  }

  const mapping = (await loadMappings()).find(
    ({ request }) =>
      (!request.method || request.method === "ANY" || request.method === req.method) &&
      (!request.urlPath || request.urlPath === urlPath) &&
      (request.bodyPatterns ?? []).every((p) => bodyMatches(p, body))
  );

  if (!mapping) {
    console.warn(`[mock] ${req.method} ${urlPath} ${raw} -> no mapping`);
    return NextResponse.json({ error: `No mock mapping for ${req.method} ${urlPath}` }, { status: 404 });
  }

  const { status = 200, headers = {}, jsonBody, body: textBody } = mapping.response;
  console.log(`[mock] ${req.method} ${urlPath} ${raw} -> ${JSON.stringify(jsonBody ?? textBody ?? "")}`);
  if (jsonBody !== undefined) return NextResponse.json(jsonBody, { status, headers });
  return new NextResponse(textBody ?? "", { status, headers });
}

export { handle as GET, handle as POST, handle as PUT, handle as PATCH, handle as DELETE };
