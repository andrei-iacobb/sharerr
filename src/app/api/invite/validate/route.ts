import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import { checkRateLimit } from "@/lib/rate-limit";
import bcrypt from "bcryptjs";

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown";
  const rateLimit = checkRateLimit(ip);

  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Too many attempts. Try again later." },
      {
        status: 429,
        headers: { "Retry-After": String(Math.ceil((rateLimit.resetAt - Date.now()) / 1000)) },
      }
    );
  }

  const { token, pin } = await req.json();
  if (!token || !pin) {
    return NextResponse.json({ error: "Missing token or PIN" }, { status: 400 });
  }

  const invite = await prisma.invite.findUnique({ where: { token } });

  if (!invite || !invite.active) {
    return NextResponse.json({ error: "Invalid or expired invite" }, { status: 404 });
  }

  if (invite.expiresAt && invite.expiresAt < new Date()) {
    return NextResponse.json({ error: "This invite has expired" }, { status: 410 });
  }

  if (invite.maxUses && invite.useCount >= invite.maxUses) {
    return NextResponse.json({ error: "This invite has reached its maximum uses" }, { status: 410 });
  }

  const pinValid = await bcrypt.compare(pin, invite.pin);
  if (!pinValid) {
    return NextResponse.json(
      { error: "Incorrect PIN", remaining: rateLimit.remaining },
      { status: 401 }
    );
  }

  // Increment use count
  await prisma.invite.update({
    where: { id: invite.id },
    data: { useCount: { increment: 1 } },
  });

  // Create DB session
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
  await prisma.session.create({
    data: {
      inviteId: invite.id,
      ipAddress: ip,
      userAgent: req.headers.get("user-agent") || null,
      expiresAt,
    },
  });

  // Set iron-session cookie
  const session = await getSession();
  session.inviteId = invite.id;
  session.inviteToken = invite.token;
  session.inviteType = invite.type;
  session.allowedSections = invite.allowedSections;
  session.ratingKey = invite.ratingKey;
  await session.save();

  const redirectUrl =
    invite.type === "DIRECT" && invite.ratingKey
      ? `/browse/movie/${invite.ratingKey}`
      : "/browse";

  return NextResponse.json({ success: true, redirectUrl });
}
