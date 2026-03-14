import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { getSession } from "@/lib/session";
import { getMetadata, getTransientToken } from "@/lib/plex";

const PLEX_URL = process.env.PLEX_URL || "http://plex.media.svc.cluster.local:32400";

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

    // Build a single continuous transcode URL (MP4, not HLS)
    const streamParams = new URLSearchParams({
      path: metadataPath,
      mediaIndex: "0",
      partIndex: "0",
      protocol: "http",
      directPlay: "0",
      directStream: "1",
      videoCodec: "h264,hevc",
      audioCodec: "aac,opus",
      subtitleCodec: "srt,vtt",
      container: "mkv",
      "X-Plex-Token": token,
      "X-Plex-Client-Identifier": clientId,
      "X-Plex-Product": "Sharerr",
      "X-Plex-Platform": "Chrome",
    });
    const plexStreamUrl = `${PLEX_URL}/video/:/transcode/universal/start?${streamParams}`;

    // Encode as proxy URL
    const streamUrl = `/api/plex-stream?b=${Buffer.from(plexStreamUrl).toString("base64url")}`;

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
