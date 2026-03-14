import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";

async function requireAdmin() {
  const session = await getSession();
  if (!session.isAdmin) throw new Error("Unauthorized");
}

export async function GET() {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const invites = await prisma.invite.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { sessions: true } } },
  });

  return NextResponse.json(invites);
}

export async function POST(req: NextRequest) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { pin, label, type, allowedSections, ratingKey, maxUses, expiresAt } = body;

  if (!pin || pin.length < 4) {
    return NextResponse.json({ error: "PIN must be at least 4 digits" }, { status: 400 });
  }

  const hashedPin = await bcrypt.hash(pin, 10);

  const invite = await prisma.invite.create({
    data: {
      pin: hashedPin,
      label: label || null,
      type: type || "LIBRARY",
      allowedSections: allowedSections || null,
      ratingKey: ratingKey || null,
      maxUses: maxUses ? parseInt(maxUses) : null,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
    },
  });

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "";
  return NextResponse.json({
    ...invite,
    url: `${baseUrl}/invite/${invite.token}`,
    pin, // Return unhashed for the admin to share
  });
}

export async function DELETE(req: NextRequest) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await req.json();
  await prisma.invite.delete({ where: { id } });

  return NextResponse.json({ success: true });
}

export async function PATCH(req: NextRequest) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id, active } = await req.json();
  const invite = await prisma.invite.update({
    where: { id },
    data: { active },
  });

  return NextResponse.json(invite);
}
