import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { getMetadata, getTransientToken, getStreamUrl, getDirectStreamUrl } from "@/lib/plex";

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

    const partKey = item.Media[0].Part[0].key;
    const token = await getTransientToken();
    const metadataPath = `/library/metadata/${ratingKey}`;

    return NextResponse.json({
      hlsUrl: getStreamUrl(metadataPath, token),
      directUrl: getDirectStreamUrl(partKey, token),
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
