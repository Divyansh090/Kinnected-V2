// src/app/api/chat/typing/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import Pusher from "pusher";

const pusher = new Pusher({
  appId:   process.env.PUSHER_APP_ID!,
  key:     process.env.NEXT_PUBLIC_PUSHER_KEY!,
  secret:  process.env.PUSHER_SECRET!,
  cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
  useTLS:  true,
});

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { groupId, receiverId } = await req.json();
  const userId = (session.user as any).id;
  const name   = session.user.name;

  let channel: string;
  if (groupId) {
    channel = `group-${groupId}`;
  } else {
    const [u1, u2] = [userId, receiverId].sort();
    channel = `private-dm-${u1}-${u2}`;
  }

  await pusher.trigger(channel, "typing", { name, userId });
  return NextResponse.json({ ok: true });
}