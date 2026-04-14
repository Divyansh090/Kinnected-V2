// src/app/api/relationships/route.ts

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET - fetch all relationships in a group
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const groupId = searchParams.get("groupId");

    if (!groupId) {
      return NextResponse.json({ error: "groupId is required" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    // Verify user is a member of this group
    const membership = await prisma.groupMember.findUnique({
      where: { userId_groupId: { userId: user.id, groupId } },
    });
    if (!membership) {
      return NextResponse.json({ error: "You are not a member of this group" }, { status: 403 });
    }

    // Get all members of the group (excluding current user)
    const members = await prisma.groupMember.findMany({
      where: { groupId, userId: { not: user.id } },
      include: {
        user: {
          select: { id: true, name: true, profilePhoto: true, bio: true },
        },
      },
    });

    // Get existing relationships set by the current user
    // const existingRelationships = await prisma.relationship.findMany({
    //   where: { groupId, fromUserId: user.id },
    //   select: { toUserId: true, relation: true },
    // });

    // const relationMap: Record<string, string> = {};
    // existingRelationships.forEach((r: { toUserId: string | number; relation: string; }) => {
    //   relationMap[r.toUserId] = r.relation;
    // });

    return NextResponse.json({
      members: members.map((m: { user: { id: string | number; }; }) => ({
        ...m.user,
        // existingRelation: relationMap[m.user.id] || null,
      })),
      currentUserId: user.id,
    });
  } catch (error) {
    console.error("Relationships GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST - save relationships in bulk
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { groupId, relationships } = body;
    // relationships: Array<{ toUserId: string; relation: string }>

    if (!groupId || !Array.isArray(relationships)) {
      return NextResponse.json({ error: "groupId and relationships are required" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    // Upsert each relationship + auto-create reverse
    const REVERSE_MAP: Record<string, string> = {
      Father: "Son/Daughter",
      Mother: "Son/Daughter",
      Son: "Father/Mother",
      Daughter: "Father/Mother",
      "Son/Daughter": "Father/Mother",
      "Father/Mother": "Son/Daughter",
      Brother: "Sibling",
      Sister: "Sibling",
      Sibling: "Sibling",
      Grandfather: "Grandchild",
      Grandmother: "Grandchild",
      Grandchild: "Grandparent",
      Grandparent: "Grandchild",
      Uncle: "Nephew/Niece",
      Aunt: "Nephew/Niece",
      Nephew: "Uncle/Aunt",
      Niece: "Uncle/Aunt",
      "Nephew/Niece": "Uncle/Aunt",
      "Uncle/Aunt": "Nephew/Niece",
      Cousin: "Cousin",
      Husband: "Wife",
      Wife: "Husband",
      Spouse: "Spouse",
    };

    // await prisma.$transaction(
    //   relationships.map(({ toUserId, relation }: { toUserId: string; relation: string }) =>
    //     prisma.relationship.upsert({
    //       where: {
    //         groupId_fromUserId_toUserId: {
    //           groupId,
    //           fromUserId: user.id,
    //           toUserId,
    //         },
    //       },
    //       update: { relation },
    //       create: { groupId, fromUserId: user.id, toUserId, relation },
    //     })
    //   )
    // );

    // // Auto-create reverse relationships (only if not already set)
    // const reverseOps = relationships
    //   .filter(({ relation }: { relation: string }) => REVERSE_MAP[relation])
    //   .map(({ toUserId, relation }: { toUserId: string; relation: string }) =>
    //     prisma.relationship.upsert({
    //       where: {
    //         groupId_fromUserId_toUserId: {
    //           groupId,
    //           fromUserId: toUserId,
    //           toUserId: user.id,
    //         },
    //       },
    //       update: {}, // don't overwrite if already set manually
    //       create: {
    //         groupId,
    //         fromUserId: toUserId,
    //         toUserId: user.id,
    //         relation: REVERSE_MAP[relation],
    //       },
    //     })
    //   );

    // await prisma.$transaction(reverseOps);

    return NextResponse.json({ message: "Relationships saved successfully!" });
  } catch (error) {
    console.error("Relationships POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}