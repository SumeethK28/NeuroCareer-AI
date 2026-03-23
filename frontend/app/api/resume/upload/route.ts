import { NextResponse } from "next/server";

const BACKEND_BASE = "http://localhost:8000/api/v1";

export async function POST(request: Request) {
  // Get token from Authorization header (sent by frontend)
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json({ detail: "Not authenticated" }, { status: 401 });
  }

  const token = authHeader.slice("Bearer ".length);

  try {
    const incomingForm = await request.formData();
    const file = incomingForm.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ detail: "File missing" }, { status: 400 });
    }

    const outbound = new FormData();
    outbound.append("file", file);

    const backendResponse = await fetch(`${BACKEND_BASE}/resume/upload`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: outbound,
    });

    const text = await backendResponse.text();
    const contentType = backendResponse.headers.get("content-type") ?? "application/json";

    return new NextResponse(text, {
      status: backendResponse.status,
      headers: { "content-type": contentType },
    });
  } catch (error) {
    return NextResponse.json(
      {
        detail:
          error instanceof Error
            ? `Resume proxy failed: ${error.message}`
            : "Resume proxy failed unexpectedly.",
      },
      { status: 502 },
    );
  }
}
