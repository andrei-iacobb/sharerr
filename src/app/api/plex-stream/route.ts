import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const PLEX_URL = process.env.PLEX_URL || "http://plex.media.svc.cluster.local:32400";
const PLEX_TOKEN = process.env.PLEX_TOKEN || "";

function addTokenToUrl(url: string): string {
  if (!url.includes("X-Plex-Token")) {
    const separator = url.includes("?") ? "&" : "?";
    return `${url}${separator}X-Plex-Token=${PLEX_TOKEN}`;
  }
  return url;
}

function extractClientId(url: string): string {
  const match = url.match(/X-Plex-Client-Identifier=([^&]+)/);
  return match ? match[1] : "sharerr";
}

function ensureClientId(url: string, clientId: string): string {
  if (!url.includes("X-Plex-Client-Identifier")) {
    const separator = url.includes("?") ? "&" : "?";
    return `${url}${separator}X-Plex-Client-Identifier=${clientId}`;
  }
  return url;
}

function makeAbsoluteUrl(relative: string, manifestUrl: string): string {
  if (relative.startsWith("http")) return relative;
  if (relative.startsWith("/")) return `${PLEX_URL}${relative}`;
  const base = manifestUrl.substring(0, manifestUrl.lastIndexOf("/") + 1);
  return `${base}${relative}`;
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
  if (!plexUrl) {
    return NextResponse.json({ error: "Missing url" }, { status: 400 });
  }

  if (!plexUrl.startsWith(PLEX_URL)) {
    return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
  }

  // Extract the client ID from the original URL to keep session consistent
  const clientId = extractClientId(plexUrl);

  // Ensure token and client ID are present
  let authenticatedUrl = addTokenToUrl(plexUrl);
  authenticatedUrl = ensureClientId(authenticatedUrl, clientId);

  const res = await fetch(authenticatedUrl, { cache: "no-store" });
  if (!res.ok) {
    console.error(`[plex-stream] ${res.status} fetching segment`);
    return new NextResponse(null, { status: res.status });
  }

  const contentType = res.headers.get("content-type") || "application/octet-stream";

  // For HLS manifests, rewrite segment URLs to go through proxy
  if (contentType.includes("mpegurl") || plexUrl.includes(".m3u8")) {
    let manifest = await res.text();

    manifest = manifest
      .split("\n")
      .map((line) => {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith("#")) {
          // Carry the client ID and token forward to sub-manifests and segments
          let absoluteUrl = makeAbsoluteUrl(trimmed, authenticatedUrl);
          absoluteUrl = addTokenToUrl(absoluteUrl);
          absoluteUrl = ensureClientId(absoluteUrl, clientId);
          return `/api/plex-stream?b=${Buffer.from(absoluteUrl).toString("base64url")}`;
        }
        if (trimmed.startsWith("#") && trimmed.includes("URI=")) {
          return line.replace(/URI="([^"]+)"/, (_match, uri) => {
            let absoluteUrl = makeAbsoluteUrl(uri, authenticatedUrl);
            absoluteUrl = addTokenToUrl(absoluteUrl);
            absoluteUrl = ensureClientId(absoluteUrl, clientId);
            return `URI="/api/plex-stream?b=${Buffer.from(absoluteUrl).toString("base64url")}"`;
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

  // For video segments, stream directly
  return new NextResponse(res.body, {
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "no-cache",
    },
  });
}
