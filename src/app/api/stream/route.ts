import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { getSession } from "@/lib/session";
import { getMetadata, getTransientToken } from "@/lib/plex";

const PLEX_URL = process.env.PLEX_URL || "http://plex.media.svc.cluster.local:32400";
const PLEX_TOKEN = process.env.PLEX_TOKEN || "";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session.inviteId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { ratingKey } = await req.json();
  if (!ratingKey) {
    return NextResponse.json({ error: "Missing ratingKey" }, { status: 400 });
  }

  try {
    const item = await getMetadata(ratingKey);
    if (!item?.Media?.[0]?.Part?.[0]) {
      return NextResponse.json({ error: "No media found" }, { status: 404 });
    }

    const clientId = `sharerr-${randomUUID().slice(0, 8)}`;
    const token = await getTransientToken(clientId);
    const metadataPath = `/library/metadata/${ratingKey}`;

    // Fetch start.m3u8 server-side ONCE to get the session ID
    const startUrl = `${PLEX_URL}/video/:/transcode/universal/start.m3u8?` + new URLSearchParams({
      path: metadataPath,
      mediaIndex: "0",
      partIndex: "0",
      protocol: "hls",
      directPlay: "1",
      directStream: "1",
      "X-Plex-Token": token,
      "X-Plex-Client-Identifier": clientId,
      "X-Plex-Product": "Sharerr",
      "X-Plex-Platform": "Chrome",
    });

    const masterRes = await fetch(startUrl, { cache: "no-store" });
    if (!masterRes.ok) {
      throw new Error(`Plex start.m3u8 error: ${masterRes.status}`);
    }
    const masterManifest = await masterRes.text();

    // Extract session path from master manifest (e.g., "session/xxx/base/index.m3u8")
    const sessionLine = masterManifest.split("\n").find(l => l.trim() && !l.startsWith("#"));
    if (!sessionLine) {
      throw new Error("No session path in master manifest");
    }

    // Build the index manifest URL - this is what HLS.js will load as the source
    const indexPlexUrl = `${PLEX_URL}/video/:/transcode/universal/${sessionLine.trim()}?X-Plex-Token=${PLEX_TOKEN}&X-Plex-Client-Identifier=${clientId}`;
    const hlsUrl = `/api/plex-stream?b=${Buffer.from(indexPlexUrl).toString("base64url")}`;

    const partKey = item.Media[0].Part[0].key;
    const directPlexUrl = `${PLEX_URL}${partKey}?X-Plex-Token=${token}&X-Plex-Client-Identifier=${clientId}`;
    const directUrl = `/api/plex-stream?b=${Buffer.from(directPlexUrl).toString("base64url")}`;

    return NextResponse.json({
      hlsUrl,
      directUrl,
      title: item.title,
      duration: item.duration,
      clientId,
    });
  } catch (err) {
    console.error("Stream error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to get stream" },
      { status: 500 }
    );
  }
}
