import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { browseSection, getMetadata, getChildren, searchPlex, getImageUrl } from "@/lib/plex";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session.inviteId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const sectionId = searchParams.get("sectionId");
  const ratingKey = searchParams.get("ratingKey");
  const children = searchParams.get("children");
  const query = searchParams.get("q");
  const start = parseInt(searchParams.get("start") || "0");
  const size = parseInt(searchParams.get("size") || "50");
  const sort = searchParams.get("sort") || "titleSort:asc";

  const allowedSections = session.allowedSections?.split(",").map((s) => s.trim());

  if (query) {
    const results = await searchPlex(query, allowedSections || undefined);
    return NextResponse.json({
      items: results.map((item) => ({
        ...item,
        thumb: item.thumb ? getImageUrl(item.thumb) : null,
        art: item.art ? getImageUrl(item.art) : null,
      })),
    });
  }

  if (ratingKey && children) {
    const items = await getChildren(ratingKey);
    return NextResponse.json({
      items: items.map((item) => ({
        ...item,
        thumb: item.thumb ? getImageUrl(item.thumb) : null,
        art: item.art ? getImageUrl(item.art) : null,
      })),
    });
  }

  if (ratingKey) {
    const item = await getMetadata(ratingKey);
    if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({
      ...item,
      thumb: item.thumb ? getImageUrl(item.thumb) : null,
      art: item.art ? getImageUrl(item.art) : null,
    });
  }

  if (sectionId) {
    if (allowedSections && !allowedSections.includes(sectionId)) {
      return NextResponse.json({ error: "Section not allowed" }, { status: 403 });
    }
    const { items, totalSize } = await browseSection(sectionId, start, size, sort);
    return NextResponse.json({
      items: items.map((item) => ({
        ...item,
        thumb: item.thumb ? getImageUrl(item.thumb) : null,
        art: item.art ? getImageUrl(item.art) : null,
      })),
      totalSize,
    });
  }

  return NextResponse.json({ error: "Missing sectionId or ratingKey" }, { status: 400 });
}
