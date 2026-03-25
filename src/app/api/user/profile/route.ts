// src/app/api/user/profile/route.ts

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { profilePhoto, bio, dateOfBirth, location } = body;

    const updatedUser = await prisma.user.update({
      where: { email: session.user.email },
      data: {
        profilePhoto: profilePhoto || null,
        bio: bio || null,
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
        location: location || null,
        isProfileComplete: true,
      },
      select: {
        id: true, name: true, email: true,
        profilePhoto: true, bio: true,
        dateOfBirth: true, location: true,
        isProfileComplete: true,
      },
    });

    return NextResponse.json({ message: "Profile updated!", user: updatedUser });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: {
        id: true, name: true, email: true,
        profilePhoto: true, bio: true,
        dateOfBirth: true, location: true,
        isProfileComplete: true,
      },
    });

    if (!user)
      return NextResponse.json({ error: "User not found" }, { status: 404 });

    return NextResponse.json({ user });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}