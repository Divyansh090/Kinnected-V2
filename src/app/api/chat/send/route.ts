// src/app/api/chat/send/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Pusher from "pusher";

const pusher = new Pusher({
  appId:   process.env.PUSHER_APP_ID!,
  key:     process.env.NEXT_PUBLIC_PUSHER_KEY!,
  secret:  process.env.PUSHER_SECRET!,
  cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
  useTLS:  true,
});

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true, name: true, profilePhoto: true },
    });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const body = await req.json();
    const { content, imageUrl, groupId, receiverId } = body;
    // groupId = group chat, receiverId = DM

    if (!content && !imageUrl)
      return NextResponse.json({ error: "Message cannot be empty" }, { status: 400 });

    const type = content && imageUrl ? "TEXT_IMAGE" : imageUrl ? "IMAGE" : "TEXT";

    let message;
    let pusherChannel: string;

    if (groupId) {
      // ── Group message ──
      message = await prisma.message.create({
        data: { content, imageUrl, type, senderId: user.id, groupId },
        include: { sender: { select: { id: true, name: true, profilePhoto: true } } },
      });
      pusherChannel = `group-${groupId}`;

    } else if (receiverId) {
      // ── DM ──
      // Find or create conversation (canonical order: smaller id first)
      const [u1, u2] = [user.id, receiverId].sort();
      const conversation = await prisma.conversation.upsert({
        where:  { user1Id_user2Id: { user1Id: u1, user2Id: u2 } },
        update: { updatedAt: new Date() },
        create: { user1Id: u1, user2Id: u2 },
      });

      message = await prisma.message.create({
        data: { content, imageUrl, type, senderId: user.id, conversationId: conversation.id },
        include: { sender: { select: { id: true, name: true, profilePhoto: true } } },
      });

      // Private channel — both users subscribe
      pusherChannel = `private-dm-${u1}-${u2}`;

    } else {
      return NextResponse.json({ error: "groupId or receiverId required" }, { status: 400 });
    }

    // Trigger Pusher event
    await pusher.trigger(pusherChannel, "new-message", {
      id:        message.id,
      content:   message.content,
      imageUrl:  message.imageUrl,
      type:      message.type,
      createdAt: message.createdAt,
      sender: {
        id:           user.id,
        name:         user.name,
        profilePhoto: user.profilePhoto,
      },
    });

    return NextResponse.json({ message });
  } catch (e) {
    console.error("Send message error:", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}