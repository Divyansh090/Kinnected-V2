import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { nanoid } from "nanoid";
import { Prisma } from "@prisma/client";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { name, description, coverPhoto } = body;

    if (!name || name.trim().length < 2) {
      return NextResponse.json(
        { error: "Family name must be at least 2 characters." },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Generate a short, readable invite code
    const inviteCode = nanoid(8).toUpperCase();

    // Create group + add creator as first member in a transaction
    const group = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const newGroup = await tx.familyGroup.create({
        data: {
          name: name.trim(),
          description: description?.trim() || null,
          coverPhoto: coverPhoto || null,
          inviteCode,
          adminId: user.id,
        },
      });

      // Add the creator as the first member
      await tx.groupMember.create({
        data: {
          userId: user.id,
          groupId: newGroup.id,
        },
      });

      return newGroup;
    },{
      timeout: 30000 // 30 seconds
    }
  );

    return NextResponse.json(
      {
        message: "Family group created successfully!",
        group: {
          id: group.id,
          name: group.name,
          inviteCode: group.inviteCode,
          description: group.description,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Group creation error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}