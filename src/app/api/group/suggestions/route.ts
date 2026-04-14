// src/app/api/group/suggestions/route.ts

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const groupId = searchParams.get("groupId");
    if (!groupId)
      return NextResponse.json({ error: "groupId required" }, { status: 400 });

    const currentUser = await prisma.user.findUnique({
      where: { email: session.user.email },
    });
    if (!currentUser)
      return NextResponse.json({ error: "User not found" }, { status: 404 });

    // Real members in the group (excluding current user)
    const groupMembers = await prisma.groupMember.findMany({
      where: { groupId, userId: { not: currentUser.id } },
      include: {
        user: { select: { id: true, name: true, profilePhoto: true } },
      },
    });

    const real = groupMembers.map((m: { user: { id: any; name: any; profilePhoto: any; }; }) => ({
      id: m.user.id,
      name: m.user.name,
      profilePhoto: m.user.profilePhoto,
    }));

    // Ghost names — collect all names typed in existing family profiles
    const profiles = await prisma.familyProfile.findMany({ where: { groupId } });

    const realNames = new Set(real.map((r: { name: string; }) => r.name.trim().toLowerCase()));
    const ghostSet  = new Set<string>();

    for (const p of profiles) {
      const candidates = [
        p.fatherName, p.motherName, p.spouseName,
        p.grandfatherPaternalName, p.grandmotherPaternalName,
        p.grandfatherMaternalName, p.grandmotherMaternalName,
        ...(p.childrenNames ?? []),
        ...(p.siblingNames  ?? []),
      ];
      for (const name of candidates) {
        if (name && name.trim() && !realNames.has(name.trim().toLowerCase())) {
          ghostSet.add(name.trim());
        }
      }
    }

    return NextResponse.json({
      real,
      ghost: Array.from(ghostSet),
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}