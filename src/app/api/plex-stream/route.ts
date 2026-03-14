import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const PLEX_URL = process.env.PLEX_URL || "http://plex.media.svc.cluster.local:32400";
const PLEX_TOKEN = process.env.PLEX_TOKEN || "";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session.inviteId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let plexUrl = req.nextUrl.searchParams.get("url");
  const b64 = req.nextUrl.searchParams.get("b");
  if (b64) {
    plexUrl = Buffer.from(b64, "base64url").toString("utf-8");
  }
  if (!plexUrl || !plexUrl.startsWith(PLEX_URL)) {
    return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
  }

  // Add token if not present
  if (!plexUrl.includes("X-Plex-Token")) {
    plexUrl += (plexUrl.includes("?") ? "&" : "?") + `X-Plex-Token=${PLEX_TOKEN}`;
  }

  // Forward range header for seeking support
  const headers: Record<string, string> = {};
  const range = req.headers.get("range");
  if (range) {
    headers["Range"] = range;
  }

  const res = await fetch(plexUrl, { cache: "no-store", headers });
  if (!res.ok && res.status !== 206) {
    return new NextResponse(null, { status: res.status });
  }

  const responseHeaders: Record<string, string> = {
    "Content-Type": res.headers.get("content-type") || "video/mp4",
    "Cache-Control": "no-cache",
    "Accept-Ranges": "bytes",
  };

  // Forward content-length and content-range for seeking
  const contentLength = res.headers.get("content-length");
  if (contentLength) responseHeaders["Content-Length"] = contentLength;
  const contentRange = res.headers.get("content-range");
  if (contentRange) responseHeaders["Content-Range"] = contentRange;

  return new NextResponse(res.body, {
    status: res.status,
    headers: responseHeaders,
  });
}
