import { NextRequest, NextResponse } from "next/server";
import { getInternalImageUrl } from "@/lib/plex";

export async function GET(req: NextRequest) {
  const path = req.nextUrl.searchParams.get("path");
  const width = parseInt(req.nextUrl.searchParams.get("w") || "300");
  const height = parseInt(req.nextUrl.searchParams.get("h") || "450");

  if (!path || !path.startsWith("/")) {
    return NextResponse.json({ error: "Invalid path" }, { status: 400 });
  }

  const imageUrl = getInternalImageUrl(path, width, height);

  const res = await fetch(imageUrl, { next: { revalidate: 86400 } });
  if (!res.ok) {
    return new NextResponse(null, { status: 404 });
  }

  const contentType = res.headers.get("content-type") || "image/jpeg";
  const buffer = await res.arrayBuffer();

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=86400, immutable",
    },
  });
}
