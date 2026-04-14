// src/app/api/chat/messages/route.ts
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
    const groupId    = searchParams.get("groupId");
    const receiverId = searchParams.get("receiverId");
    const cursor     = searchParams.get("cursor"); // for pagination
    const limit      = 40;

    const user = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const messageSelect = {
      id: true, content: true, imageUrl: true, type: true, createdAt: true,
      sender: { select: { id: true, name: true, profilePhoto: true } },
    };

    let messages;

    if (groupId) {
      messages = await prisma.message.findMany({
        where:   { groupId },
        orderBy: { createdAt: "desc" },
        take:    limit,
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
        select:  messageSelect,
      });

    } else if (receiverId) {
      const [u1, u2] = [user.id, receiverId].sort();
      const conversation = await prisma.conversation.findUnique({
        where: { user1Id_user2Id: { user1Id: u1, user2Id: u2 } },
      });
      if (!conversation) return NextResponse.json({ messages: [], nextCursor: null });

      messages = await prisma.message.findMany({
        where:   { conversationId: conversation.id },
        orderBy: { createdAt: "desc" },
        take:    limit,
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
        select:  messageSelect,
      });
    } else {
      return NextResponse.json({ error: "groupId or receiverId required" }, { status: 400 });
    }

    const nextCursor = messages.length === limit ? messages[messages.length - 1].id : null;
    // Reverse so oldest first for display
    messages.reverse();

    return NextResponse.json({ messages, nextCursor });
  } catch (e) {
    console.error("Fetch messages error:", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}