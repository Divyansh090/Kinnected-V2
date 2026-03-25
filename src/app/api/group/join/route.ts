// src/app/api/group/join/route.ts

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { inviteCode } = body;

    if (!inviteCode || inviteCode.trim().length === 0) {
      return NextResponse.json(
        { error: "Invite code is required." },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Find group by invite code
    const group = await prisma.familyGroup.findUnique({
      where: { inviteCode: inviteCode.trim().toUpperCase() },
    });

    if (!group) {
      return NextResponse.json(
        { error: "Invalid invite code. Please check and try again." },
        { status: 404 }
      );
    }

    // Check if already a member
    const existingMembership = await prisma.groupMember.findUnique({
      where: { userId_groupId: { userId: user.id, groupId: group.id } },
    });

    if (existingMembership) {
      return NextResponse.json(
        { error: "You are already a member of this family group." },
        { status: 409 }
      );
    }

    // Add as member
    await prisma.groupMember.create({
      data: { userId: user.id, groupId: group.id },
    });

    return NextResponse.json(
      {
        message: `You've joined ${group.name}!`,
        group: {
          id: group.id,
          name: group.name,
          inviteCode: group.inviteCode,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Group join error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}