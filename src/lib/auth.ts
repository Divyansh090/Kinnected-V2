// src/lib/auth.ts

import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        });

        if (!user) return null;

        const isValid = await bcrypt.compare(credentials.password, user.password);
        if (!isValid) return null;

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          isProfileComplete: user.isProfileComplete,
        };
      },
    }),
  ],

  callbacks: {
    async jwt({ token, user, trigger }) {
      // On first sign-in, attach user data to token
      if (user) {
        token.id = user.id;
        token.isProfileComplete = (user as any).isProfileComplete ?? false;
      }

      // ✅ KEY FIX: When session is updated (trigger === "update")
      // OR on every token refresh, re-read isProfileComplete from DB
      // This ensures middleware sees the latest value after /api/user/profile PATCH
      if (trigger === "update" || (token.email && token.isProfileComplete === false)) {
        const dbUser = await prisma.user.findUnique({
          where: { email: token.email as string },
          select: { id: true, isProfileComplete: true },
        });
        if (dbUser) {
          token.id = dbUser.id;
          token.isProfileComplete = dbUser.isProfileComplete;
        }
      }

      return token;
    },

    async session({ session, token }) {
      // Expose token fields to the session object
      if (session.user) {
        (session.user as any).id = token.id as string;
        (session.user as any).isProfileComplete = token.isProfileComplete as boolean;
      }
      return session;
    },
  },

  pages: {
    signIn: "/signin",
  },

  session: {
    strategy: "jwt",
  },

  secret: process.env.NEXTAUTH_SECRET,
};