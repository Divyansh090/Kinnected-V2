// src/app/api/family-profile/route.ts

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// ── Fuzzy name matcher ──────────────────────────────────────────────────────
// Normalise a name for comparison
function normaliseName(name: string) {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

// Simple similarity: what fraction of words in `query` appear in `candidate`
function nameSimilarity(query: string, candidate: string): number {
  const qWords = normaliseName(query).split(" ");
  const cWords = normaliseName(candidate).split(" ");
  const matches = qWords.filter((w) => cWords.includes(w)).length;
  return matches / Math.max(qWords.length, 1);
}

function matchNameToMember(
  name: string,
  members: { id: string; name: string }[]
): string | null {
  if (!name?.trim()) return null;
  let best: { id: string; score: number } | null = null;
  for (const m of members) {
    const score = nameSimilarity(name, m.name);
    if (score >= 0.5 && (!best || score > best.score)) {
      best = { id: m.id, score };
    }
  }
  return best?.id ?? null;
}

// ── GET — fetch existing profile ────────────────────────────────────────────
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const groupId = searchParams.get("groupId");
    if (!groupId)
      return NextResponse.json({ error: "groupId required" }, { status: 400 });

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });
    if (!user)
      return NextResponse.json({ error: "User not found" }, { status: 404 });

    const profile = await prisma.familyProfile.findUnique({
      where: { userId_groupId: { userId: user.id, groupId } },
    });

    return NextResponse.json({ profile: profile ?? null });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// ── POST — save / update profile & auto-match names ─────────────────────────
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { groupId, ...fields } = body;
    /*
      Expected body shape:
      {
        groupId: string,
        fatherName?: string,
        motherName?: string,
        spouseName?: string,
        childrenNames?: string[],
        siblingNames?: string[],
        grandfatherPaternalName?: string,
        grandmotherPaternalName?: string,
        grandfatherMaternalName?: string,
        grandmotherMaternalName?: string,
      }
    */

    if (!groupId)
      return NextResponse.json({ error: "groupId required" }, { status: 400 });

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });
    if (!user)
      return NextResponse.json({ error: "User not found" }, { status: 404 });

    // Verify membership
    const member = await prisma.groupMember.findUnique({
      where: { userId_groupId: { userId: user.id, groupId } },
    });
    if (!member)
      return NextResponse.json({ error: "Not a group member" }, { status: 403 });

    // Fetch all group members for name matching
    const groupMembers = await prisma.groupMember.findMany({
      where: { groupId, userId: { not: user.id } },
      include: { user: { select: { id: true, name: true } } },
    });
    const memberList = groupMembers.map((m) => m.user);

    // Auto-match single names
    const fatherId   = matchNameToMember(fields.fatherName ?? "", memberList);
    const motherId   = matchNameToMember(fields.motherName ?? "", memberList);
    const spouseId   = matchNameToMember(fields.spouseName ?? "", memberList);
    const grandfatherPaternalId = matchNameToMember(fields.grandfatherPaternalName ?? "", memberList);
    const grandmotherPaternalId = matchNameToMember(fields.grandmotherPaternalName ?? "", memberList);
    const grandfatherMaternalId = matchNameToMember(fields.grandfatherMaternalName ?? "", memberList);
    const grandmotherMaternalId = matchNameToMember(fields.grandmotherMaternalName ?? "", memberList);

    // Auto-match arrays
    const childrenNames: string[] = fields.childrenNames ?? [];
    const childrenIds: string[]   = childrenNames.map((n) => matchNameToMember(n, memberList) ?? "");

    const siblingNames: string[]  = fields.siblingNames ?? [];
    const siblingIds: string[]    = siblingNames.map((n) => matchNameToMember(n, memberList) ?? "");

    const profile = await prisma.familyProfile.upsert({
      where: { userId_groupId: { userId: user.id, groupId } },
      update: {
        fatherName: fields.fatherName || null,   fatherId,
        motherName: fields.motherName || null,   motherId,
        spouseName: fields.spouseName || null,   spouseId,
        childrenNames, childrenIds,
        siblingNames,  siblingIds,
        grandfatherPaternalName: fields.grandfatherPaternalName || null, grandfatherPaternalId,
        grandmotherPaternalName: fields.grandmotherPaternalName || null, grandmotherPaternalId,
        grandfatherMaternalName: fields.grandfatherMaternalName || null, grandfatherMaternalId,
        grandmotherMaternalName: fields.grandmotherMaternalName || null, grandmotherMaternalId,
      },
      create: {
        userId: user.id, groupId,
        fatherName: fields.fatherName || null,   fatherId,
        motherName: fields.motherName || null,   motherId,
        spouseName: fields.spouseName || null,   spouseId,
        childrenNames, childrenIds,
        siblingNames,  siblingIds,
        grandfatherPaternalName: fields.grandfatherPaternalName || null, grandfatherPaternalId,
        grandmotherPaternalName: fields.grandmotherPaternalName || null, grandmotherPaternalId,
        grandfatherMaternalName: fields.grandfatherMaternalName || null, grandfatherMaternalId,
        grandmotherMaternalName: fields.grandmotherMaternalName || null, grandmotherMaternalId,
      },
    });

    // Count how many names were successfully matched
    const allIds = [
      fatherId, motherId, spouseId,
      grandfatherPaternalId, grandmotherPaternalId,
      grandfatherMaternalId, grandmotherMaternalId,
      ...childrenIds.filter(Boolean), ...siblingIds.filter(Boolean),
    ].filter(Boolean);

    return NextResponse.json({
      message: "Family profile saved!",
      matchedCount: allIds.length,
      profile,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}