// src/app/api/family-tree/route.ts

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

export interface TreeNode {
  id: string;
  name: string;
  profilePhoto: string | null;
  isGhost: boolean;
  isCurrentUser: boolean;
  bio?: string | null;
  dateOfBirth?: string | null;
}

export interface TreeEdge {
  from: string;
  to: string;
  relation: string;
  confirmed: boolean;
}



// ── Name normalisation ────────────────────────────────────────────────────────
function normName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

// Word-overlap similarity: what % of query words appear in candidate
function similarity(a: string, b: string): number {
  const wa = normName(a).split(" ");
  const wb = normName(b).split(" ");
  const matches = wa.filter((w) => wb.includes(w)).length;
  return matches / Math.max(wa.length, wb.length);
}

// ── Smart resolve: given a typed name, return the best real userId or null ───
function resolveToRealUser(
  typedName: string,
  members: { id: string; name: string }[],
  threshold = 0.4          // lowered from 0.5 so "Divyansh" matches "Divyansh Rathi"
): string | null {
  if (!typedName?.trim()) return null;
  let best: { id: string; score: number } | null = null;
  for (const m of members) {
    const score = similarity(typedName, m.name);
    if (score >= threshold && (!best || score > best.score)) {
      best = { id: m.id, score };
    }
  }
  return best?.id ?? null;
}

// ── Ghost key — global by normalised name (NOT per-owner) ────────────────────
// This is the core fix: same name typed by different people = same ghost node
function ghostKey(name: string): string {
  return `ghost__${normName(name).replace(/\s+/g, "_")}`;
}

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const groupId = searchParams.get("groupId");
    if (!groupId)
      return NextResponse.json({ error: "groupId required" }, { status: 400 });

    const currentUser = await prisma.user.findUnique({
      where: { email: session.user.email },
    });
    if (!currentUser)
      return NextResponse.json({ error: "User not found" }, { status: 404 });

    // ── Fetch data ─────────────────────────────────────────────────────────
    const groupMembers = await prisma.groupMember.findMany({
      where: { groupId },
      include: {
        user: {
          select: { id: true, name: true, profilePhoto: true, bio: true, dateOfBirth: true },
        },
      },
    });

    const profiles = await prisma.familyProfile.findMany({ where: { groupId } });

    const memberList = groupMembers.map((m: { user: any; }) => m.user);

    // ── Build real node map ────────────────────────────────────────────────
    const nodeMap = new Map<string, TreeNode>();

    groupMembers.forEach((m: { user: any; }) => {
      nodeMap.set(m.user.id, {
        id: m.user.id,
        name: m.user.name,
        profilePhoto: m.user.profilePhoto,
        isGhost: false,
        isCurrentUser: m.user.id === currentUser.id,
        bio: m.user.bio,
        dateOfBirth: m.user.dateOfBirth?.toISOString() ?? null,
      });
    });

    // ── Smart resolve: typed name → real userId OR ghost key ──────────────
    // First tries to fuzzy-match against registered members.
    // Falls back to a global ghost key (deduped by name, not by who typed it).
    const resolveId = (typedName: string): string => {
      if (!typedName?.trim()) return "";

      // 1. Try to match a real registered member
      const realId = resolveToRealUser(typedName, memberList);
      if (realId) return realId;

      // 2. Fall back to global ghost node (same name = same node)
      const key = ghostKey(typedName);
      if (!nodeMap.has(key)) {
        nodeMap.set(key, {
          id: key,
          name: typedName.trim(),
          profilePhoto: null,
          isGhost: true,
          isCurrentUser: false,
        });
      }
      return key;
    };

    // ── Edge map ───────────────────────────────────────────────────────────
    // Keyed by canonical "smallerId|largerId|relation" to auto-dedup bidirectional edges
    const edgeMap = new Map<string, { from: string; to: string; relation: string; votes: number }>();

    const addEdge = (from: string, to: string, relation: string) => {
      if (!from || !to || from === to) return; // skip self-loops and empty ids

      // Use sorted canonical key so A→B and B→A are the same edge
      const [a, b] = [from, to].sort();
      const key = `${a}|${b}|${relation}`;

      if (edgeMap.has(key)) {
        edgeMap.get(key)!.votes++;
      } else {
        // Always store with original from/to direction for display
        edgeMap.set(key, { from, to, relation, votes: 1 });
      }
    };

    // ── Process each family profile ────────────────────────────────────────
    for (const p of profiles) {
      const uid = p.userId;

      // Father
      if (p.fatherName) {
        const fid = p.fatherId || resolveId(p.fatherName);
        addEdge(fid, uid, "parent");
      }

      // Mother
      if (p.motherName) {
        const mid = p.motherId || resolveId(p.motherName);
        addEdge(mid, uid, "parent");
      }

      // Spouse
      if (p.spouseName) {
        const sid = p.spouseId || resolveId(p.spouseName);
        addEdge(uid, sid, "spouse");
      }

      // Children
      p.childrenNames.forEach((name: string, i: number) => {
        const cid = p.childrenIds[i] || resolveId(name);
        addEdge(uid, cid, "parent");
      });

      // Siblings
      p.siblingNames.forEach((name: string, i: number) => {
        const sid = p.siblingIds[i] || resolveId(name);
        addEdge(uid, sid, "sibling");
      });

      // Grandparents — paternal only
      if (p.grandfatherPaternalName) {
        const gid = p.grandfatherPaternalId || resolveId(p.grandfatherPaternalName);
        addEdge(gid, uid, "grandparent");
      }
      if (p.grandmotherPaternalName) {
        const gid = p.grandmotherPaternalId || resolveId(p.grandmotherPaternalName);
        addEdge(gid, uid, "grandparent");
      }

      // Maternal grandparents: saved in DB but excluded from tree
      // Uncomment to show: grandfatherMaternalName / grandmotherMaternalName
    }

    // ── Post-process: merge ghost nodes that now match a real member ───────
    // Scenario: Anuj typed "Divyansh Rathi" before Divyansh joined.
    // After Divyansh joins, his ghost node should become his real node.
    const ghostToReal = new Map<string, string>(); // ghostKey → realUserId

    nodeMap.forEach((node, key) => {
      if (!node.isGhost) return;
      const realId = resolveToRealUser(node.name, memberList, 0.4);
      if (realId) {
        ghostToReal.set(key, realId);
      }
    });

    // Remove ghost nodes that have a real counterpart
    ghostToReal.forEach((_, ghostId) => nodeMap.delete(ghostId));

    // Rewrite edges: replace ghost IDs with real IDs
    const resolvedEdgeMap = new Map<string, { from: string; to: string; relation: string; votes: number }>();

    edgeMap.forEach((edge) => {
      const from = ghostToReal.get(edge.from) ?? edge.from;
      const to   = ghostToReal.get(edge.to)   ?? edge.to;

      if (!from || !to || from === to) return; // skip after resolution

      const [a, b] = [from, to].sort();
      const key = `${a}|${b}|${edge.relation}`;

      if (resolvedEdgeMap.has(key)) {
        resolvedEdgeMap.get(key)!.votes += edge.votes;
      } else {
        resolvedEdgeMap.set(key, { from, to, relation: edge.relation, votes: edge.votes });
      }
    });

    // ── Finalise ───────────────────────────────────────────────────────────
    const edges: TreeEdge[] = Array.from(resolvedEdgeMap.values()).map((e) => ({
      from: e.from,
      to: e.to,
      relation: e.relation,
      confirmed: e.votes >= 2, // confirmed = mentioned by both sides
    }));

    const nodes: TreeNode[] = Array.from(nodeMap.values());

    return NextResponse.json({ nodes, edges, currentUserId: currentUser.id });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}