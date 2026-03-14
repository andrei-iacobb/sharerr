import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const PLEX_URL = process.env.PLEX_URL || "http://plex.media.svc.cluster.local:32400";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session.inviteId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const plexUrl = req.nextUrl.searchParams.get("url");
  if (!plexUrl) {
    return NextResponse.json({ error: "Missing url" }, { status: 400 });
  }

  // Validate URL points to our Plex server
  if (!plexUrl.startsWith(PLEX_URL)) {
    return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
  }

  const res = await fetch(plexUrl, { cache: "no-store" });
  if (!res.ok) {
    return new NextResponse(null, { status: res.status });
  }

  const contentType = res.headers.get("content-type") || "application/octet-stream";

  // For HLS manifests, rewrite segment URLs to go through proxy
  if (contentType.includes("mpegurl") || plexUrl.includes(".m3u8")) {
    let manifest = await res.text();

    // Rewrite relative URLs in the manifest to proxy through us
    // Lines that don't start with # are segment URLs
    manifest = manifest
      .split("\n")
      .map((line) => {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith("#")) {
          // Relative URL — make it absolute and proxy it
          let absoluteUrl: string;
          if (trimmed.startsWith("http")) {
            absoluteUrl = trimmed;
          } else if (trimmed.startsWith("/")) {
            absoluteUrl = `${PLEX_URL}${trimmed}`;
          } else {
            // Relative to the manifest URL
            const base = plexUrl.substring(0, plexUrl.lastIndexOf("/") + 1);
            absoluteUrl = `${base}${trimmed}`;
          }
          return `/api/plex-stream?url=${encodeURIComponent(absoluteUrl)}`;
        }
        // Also rewrite URI= in EXT-X-MAP or EXT-X-KEY
        if (trimmed.startsWith("#") && trimmed.includes("URI=")) {
          return line.replace(/URI="([^"]+)"/, (_match, uri) => {
            let absoluteUrl: string;
            if (uri.startsWith("http")) {
              absoluteUrl = uri;
            } else if (uri.startsWith("/")) {
              absoluteUrl = `${PLEX_URL}${uri}`;
            } else {
              const base = plexUrl.substring(0, plexUrl.lastIndexOf("/") + 1);
              absoluteUrl = `${base}${uri}`;
            }
            return `URI="/api/plex-stream?url=${encodeURIComponent(absoluteUrl)}"`;
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
