import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { getSections } from "@/lib/plex";

export async function GET() {
  const session = await getSession();
  if (!session.inviteId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sections = await getSections();
  const allowed = session.allowedSections?.split(",").map((s) => s.trim());

  const filtered = allowed
    ? sections.filter((s) => allowed.includes(s.key))
    : sections.filter((s) => s.type === "movie" || s.type === "show");

  return NextResponse.json(filtered);
}
