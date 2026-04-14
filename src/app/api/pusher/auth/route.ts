// src/app/api/pusher/auth/route.ts
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

  const body     = await req.text();
  const params   = new URLSearchParams(body);
  const socketId = params.get("socket_id")!;
  const channel  = params.get("channel_name")!;

  const userId = (session.user as any).id;
  const auth   = pusher.authorizeChannel(socketId, channel, {
    user_id: userId,
    user_info: { name: session.user.name },
  });

  return NextResponse.json(auth);
}