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

    // Create HLS session server-side (prevents session re-creation on retry)
    const startParams = new URLSearchParams({
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

    const masterRes = await fetch(`${PLEX_URL}/video/:/transcode/universal/start.m3u8?${startParams}`, {
      cache: "no-store",
    });
    if (!masterRes.ok) {
      throw new Error(`Plex transcode error: ${masterRes.status}`);
    }
    const masterManifest = await masterRes.text();

    const sessionLine = masterManifest.split("\n").find((l) => l.trim() && !l.startsWith("#"));
    if (!sessionLine) {
      throw new Error("No session path in master manifest");
    }

    // Give HLS.js the index.m3u8 URL directly — proxied through sharerr
    const indexPlexUrl = `${PLEX_URL}/video/:/transcode/universal/${sessionLine.trim()}?X-Plex-Token=${PLEX_TOKEN}&X-Plex-Client-Identifier=${clientId}`;
    const streamUrl = `/api/plex-stream?b=${Buffer.from(indexPlexUrl).toString("base64url")}`;

    return NextResponse.json({
      streamUrl,
      title: item.title,
      duration: item.duration,
    });
  } catch (err) {
    console.error("Stream error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to get stream" },
      { status: 500 }
    );
  }
}
