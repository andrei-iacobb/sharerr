import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const PLEX_URL = process.env.PLEX_URL || "http://plex.media.svc.cluster.local:32400";
const PLEX_TOKEN = process.env.PLEX_TOKEN || "";

function addAuth(url: string): string {
  if (!url.includes("X-Plex-Token")) {
    url += (url.includes("?") ? "&" : "?") + `X-Plex-Token=${PLEX_TOKEN}`;
  }
  // Preserve client ID from parent URL if missing
  if (!url.includes("X-Plex-Client-Identifier")) {
    url += `&X-Plex-Client-Identifier=sharerr`;
  }
  return url;
}

function makeAbsolute(relative: string, manifestUrl: string): string {
  if (relative.startsWith("http")) return relative;
  if (relative.startsWith("/")) return `${PLEX_URL}${relative}`;
  const base = manifestUrl.substring(0, manifestUrl.lastIndexOf("/") + 1);
  return `${base}${relative}`;
}

function extractClientId(url: string): string {
  const match = url.match(/X-Plex-Client-Identifier=([^&]+)/);
  return match ? match[1] : "sharerr";
}

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

  const clientId = extractClientId(plexUrl);
  const authenticatedUrl = addAuth(plexUrl);

  // Forward range header for seeking
  const headers: Record<string, string> = {};
  const range = req.headers.get("range");
  if (range) headers["Range"] = range;

  const res = await fetch(authenticatedUrl, { cache: "no-store", headers });
  if (!res.ok && res.status !== 206) {
    return new NextResponse(null, { status: res.status });
  }

  const contentType = res.headers.get("content-type") || "application/octet-stream";

  // HLS manifest — rewrite segment URLs to go through proxy
  if (contentType.includes("mpegurl") || plexUrl.includes(".m3u8")) {
    let manifest = await res.text();

    manifest = manifest
      .split("\n")
      .map((line) => {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith("#")) {
          let url = makeAbsolute(trimmed, authenticatedUrl);
          url = addAuth(url);
          if (!url.includes("X-Plex-Client-Identifier")) {
            url += `&X-Plex-Client-Identifier=${clientId}`;
          }
          return `/api/plex-stream?b=${Buffer.from(url).toString("base64url")}`;
        }
        if (trimmed.startsWith("#") && trimmed.includes("URI=")) {
          return line.replace(/URI="([^"]+)"/, (_match, uri) => {
            let url = makeAbsolute(uri, authenticatedUrl);
            url = addAuth(url);
            return `URI="/api/plex-stream?b=${Buffer.from(url).toString("base64url")}"`;
          });
        }
        return line;
      })
      .join("\n");

    return new NextResponse(manifest, {
      headers: {
        "Content-Type": "application/vnd.apple.mpegurl",
        "Cache-Control": "no-cache",
      },
    });
  }

  // Video segments — stream through
  const responseHeaders: Record<string, string> = {
    "Content-Type": contentType,
    "Cache-Control": "no-cache",
  };
  const cl = res.headers.get("content-length");
  if (cl) responseHeaders["Content-Length"] = cl;
  const cr = res.headers.get("content-range");
  if (cr) responseHeaders["Content-Range"] = cr;

  return new NextResponse(res.body, {
    status: res.status,
    headers: responseHeaders,
  });
}
