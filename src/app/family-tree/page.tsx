"use client";

import React, { useEffect, useState, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";

// ── Types ────────────────────────────────────────────────────────────────────

interface TreeNode {
  id: string;
  name: string;
  profilePhoto: string | null;
  bio: string | null;
  dateOfBirth: string | null;
  isCurrentUser: boolean;
  isGhost: boolean; // unregistered / pending member
}

interface TreeEdge {
  from: string;
  to: string;
  relation: string; // "parent" | "spouse" | "sibling" | "grandparent"
  confirmed: boolean;
}

interface PositionedNode extends TreeNode {
  x: number;
  y: number;
}

// ── Layout ───────────────────────────────────────────────────────────────────

const NODE_W     = 130;
const NODE_H     = 150;
const GAP_X      = 60;
const COUPLE_GAP = 20;
const GAP_Y      = 140;

interface SingleSlot { type: "single"; id: string; }
interface CoupleSlot { type: "couple"; left: string; right: string; }
type Slot = SingleSlot | CoupleSlot;

function slotWidth(slot: Slot): number {
  return slot.type === "couple" ? NODE_W + COUPLE_GAP + NODE_W : NODE_W;
}

function layoutNodes(nodes: TreeNode[], edges: TreeEdge[]): PositionedNode[] {
  if (nodes.length === 0) return [];

  // ── Build relationship maps ───────────────────────────────────────────────
  const spouseOf   = new Map<string, string>();
  const parentsOf  = new Map<string, string[]>(); // childId  → parentIds
  const childrenOf = new Map<string, string[]>(); // parentId → childIds (deduped)

  edges.forEach((e) => {
    if (e.relation === "spouse") {
      spouseOf.set(e.from, e.to);
      spouseOf.set(e.to, e.from);
    }
    if (e.relation === "parent" || e.relation === "grandparent") {
      if (!childrenOf.has(e.from)) childrenOf.set(e.from, []);
      if (!childrenOf.get(e.from)!.includes(e.to))
        childrenOf.get(e.from)!.push(e.to);
      if (!parentsOf.has(e.to)) parentsOf.set(e.to, []);
      if (!parentsOf.get(e.to)!.includes(e.from))
        parentsOf.get(e.to)!.push(e.from);
    }
  });

  const allIds = nodes.map((n) => n.id);

  // ── Assign layers via topological sort ────────────────────────────────────
  // Build directed edges: parent → child means parent has lower layer
  const inDegree = new Map<string, number>();
  allIds.forEach((id) => inDegree.set(id, 0));

  // Only count PARENT→CHILD edges for layer assignment (not spouse/sibling)
  allIds.forEach((id) => {
    (childrenOf.get(id) ?? []).forEach((childId) => {
      inDegree.set(childId, (inDegree.get(childId) ?? 0) + 1);
    });
    (parentsOf.get(id) ?? []).forEach((parentId) => {
      if (allIds.includes(parentId)) {
        inDegree.set(id, (inDegree.get(id) ?? 0) + 1);
      }
    });
  });

  // Re-compute cleanly: for each node, count unique "above" constraints
  const aboveEdges = new Map<string, Set<string>>(); // child → Set<parent>
  allIds.forEach((id) => aboveEdges.set(id, new Set()));

  allIds.forEach((id) => {
    (childrenOf.get(id) ?? []).forEach((childId) => {
      aboveEdges.get(childId)!.add(id);
    });
    (parentsOf.get(id) ?? []).filter((p) => allIds.includes(p)).forEach((parentId) => {
      aboveEdges.get(id)!.add(parentId);
    });
  });

  // Kahn BFS for longest-path layering
  const layerOf = new Map<string, number>();
  const deg     = new Map<string, number>();
  allIds.forEach((id) => deg.set(id, aboveEdges.get(id)!.size));

  const topoQ: string[] = [];
  allIds.forEach((id) => { if (deg.get(id) === 0) { layerOf.set(id, 0); topoQ.push(id); } });

  while (topoQ.length > 0) {
    const curr = topoQ.shift()!;
    const cl   = layerOf.get(curr) ?? 0;
    // Propagate to children
    (childrenOf.get(curr) ?? []).forEach((childId) => {
      layerOf.set(childId, Math.max(layerOf.get(childId) ?? 0, cl + 1));
      const newDeg = (deg.get(childId) ?? 1) - 1;
      deg.set(childId, newDeg);
      if (newDeg === 0) topoQ.push(childId);
    });
  }

  // Unvisited fallback
  allIds.forEach((id) => { if (!layerOf.has(id)) layerOf.set(id, 0); });

  // Spouses/siblings: force same layer (max of pair), stabilise with passes
  for (let pass = 0; pass < 10; pass++) {
    let changed = false;
    edges.forEach((e) => {
      if (e.relation !== "spouse" && e.relation !== "sibling") return;
      const la = layerOf.get(e.from) ?? 0;
      const lb = layerOf.get(e.to)   ?? 0;
      if (la !== lb) {
        const mx = Math.max(la, lb);
        layerOf.set(e.from, mx);
        layerOf.set(e.to,   mx);
        changed = true;
      }
    });
    if (!changed) break;
  }

  // ── Build couple units ────────────────────────────────────────────────────
  // A "unit" is either a couple [left, right] or a single [id]
  // coupleKey: sorted "idA|idB"
  const getCoupleKey = (id: string): string => {
    const partner = spouseOf.get(id);
    return partner ? [id, partner].sort().join("|") : id;
  };

  // ── For each unit, collect its children ───────────────────────────────────
  // childId → coupleKey of parent
  const unitChildren = new Map<string, string[]>(); // coupleKey → childIds[]
  const assignedToUnit = new Set<string>();

  // Process all nodes that have parents
  allIds.forEach((childId) => {
    if (assignedToUnit.has(childId)) return;
    const myParents = (parentsOf.get(childId) ?? []).filter((p) => allIds.includes(p));
    const myParentEdgeFroms = (childrenOf.get("") ?? []); // unused
    
    // Also check who lists this node as child
    const parentsThatListMe = allIds.filter((pid) =>
      (childrenOf.get(pid) ?? []).includes(childId)
    );
    
    const allMyParents = [...new Set([...myParents, ...parentsThatListMe])];
    if (allMyParents.length === 0) return;

    // Find a parent with a spouse to form couple key
    let unitKey = allMyParents[0];
    for (const pid of allMyParents) {
      const partner = spouseOf.get(pid);
      if (partner && allIds.includes(partner)) {
        unitKey = [pid, partner].sort().join("|");
        break;
      }
    }

    if (!unitChildren.has(unitKey)) unitChildren.set(unitKey, []);
    if (!unitChildren.get(unitKey)!.includes(childId))
      unitChildren.get(unitKey)!.push(childId);
    assignedToUnit.add(childId);
  });

  // ── Bottom-up width calculation ───────────────────────────────────────────
  // Each unit needs at least enough width for its own slot,
  // but grows to accommodate all its children's total width.
  const unitWidth = new Map<string, number>(); // coupleKey/singleId → pixel width

  const getUnitWidth = (unitKey: string): number => {
    if (unitWidth.has(unitKey)) return unitWidth.get(unitKey)!;

    // Own slot width
    const ids = unitKey.includes("|") ? unitKey.split("|") : [unitKey];
    const ownW = ids.length === 2
      ? NODE_W + COUPLE_GAP + NODE_W
      : NODE_W;

    // Children total width
    const children = unitChildren.get(unitKey) ?? [];
    if (children.length === 0) {
      unitWidth.set(unitKey, ownW);
      return ownW;
    }

    // Each child belongs to its own unit — get those units
    const childUnitKeys = [...new Set(children.map((cid) => getCoupleKey(cid)))];
    const childrenTotalW = childUnitKeys.reduce((sum, cuk, i) =>
      sum + getUnitWidth(cuk) + (i > 0 ? GAP_X : 0), 0
    );

    const w = Math.max(ownW, childrenTotalW);
    unitWidth.set(unitKey, w);
    return w;
  };

  // ── Group by layer and position ───────────────────────────────────────────
  const byLayer = new Map<number, string[]>();
  layerOf.forEach((layer, id) => {
    if (!byLayer.has(layer)) byLayer.set(layer, []);
    byLayer.get(layer)!.push(id);
  });

  const posMap       = new Map<string, { x: number; y: number }>();
  const sortedLayers = Array.from(byLayer.keys()).sort((a, b) => a - b);

  sortedLayers.forEach((layer, li) => {
    const ids = byLayer.get(layer)!;
    const y   = li * (NODE_H + GAP_Y);

    // Build ordered list of nodes for this layer
    let orderedIds: string[];

    if (li === 0) {
      orderedIds = [...ids];
    } else {
      // Group nodes by their parent unit, sorted by parent X position
      const groups = new Map<string, string[]>(); // parentUnitKey → nodeIds

      ids.forEach((id) => {
        const myParents = (parentsOf.get(id) ?? []).filter((p) => allIds.includes(p));
        const parentsThatListMe = allIds.filter((pid) =>
          (childrenOf.get(pid) ?? []).includes(id)
        );
        const allMyParents = [...new Set([...myParents, ...parentsThatListMe])];

        let unitKey = "__orphan__";
        if (allMyParents.length > 0) {
          unitKey = allMyParents[0];
          for (const pid of allMyParents) {
            const partner = spouseOf.get(pid);
            if (partner && allIds.includes(partner)) {
              unitKey = [pid, partner].sort().join("|");
              break;
            }
          }
        }

        if (!groups.has(unitKey)) groups.set(unitKey, []);
        groups.get(unitKey)!.push(id);
      });

      // Sort groups by parent X
      const sortedGroups = Array.from(groups.entries()).sort(([kA], [kB]) => {
        const getX = (k: string) => {
          if (k === "__orphan__") return 99999;
          const pid = k.split("|")[0];
          return posMap.get(pid)?.x ?? 0;
        };
        return getX(kA) - getX(kB);
      });

      orderedIds = [];
      sortedGroups.forEach(([, gids]) => orderedIds.push(...gids));
    }

    // Build slots pairing spouses
    const slots: Slot[]  = [];
    const slotPlaced = new Set<string>();

    orderedIds.forEach((id) => {
      if (slotPlaced.has(id)) return;
      const partner = spouseOf.get(id);
      if (partner && orderedIds.includes(partner) && !slotPlaced.has(partner)) {
        const iA = orderedIds.indexOf(id);
        const iB = orderedIds.indexOf(partner);
        const [l, r] = iA <= iB ? [id, partner] : [partner, id];
        slots.push({ type: "couple", left: l, right: r });
        slotPlaced.add(l); slotPlaced.add(r);
      } else if (!slotPlaced.has(id)) {
        slots.push({ type: "single", id });
        slotPlaced.add(id);
      }
    });

    // Assign X positions with dynamic spacing based on subtree widths
    const totalW = slots.reduce((sum, slot, i) => {
      const unitKey = slot.type === "couple"
        ? [slot.left, slot.right].sort().join("|")
        : slot.id;
      const w = Math.max(slotWidth(slot), getUnitWidth(unitKey));
      return sum + w + (i > 0 ? GAP_X : 0);
    }, 0);

    let curX = -totalW / 2;

    slots.forEach((slot) => {
      const unitKey = slot.type === "couple"
        ? [slot.left, slot.right].sort().join("|")
        : slot.id;
      const allocatedW = Math.max(slotWidth(slot), getUnitWidth(unitKey));
      const slotW      = slotWidth(slot);
      // Centre the couple/single within its allocated space
      const offset     = (allocatedW - slotW) / 2;

      if (slot.type === "couple") {
        posMap.set(slot.left,  { x: curX + offset,                        y });
        posMap.set(slot.right, { x: curX + offset + NODE_W + COUPLE_GAP,  y });
      } else {
        posMap.set(slot.id, { x: curX + offset, y });
      }
      curX += allocatedW + GAP_X;
    });
  });

  return nodes.map((n) => ({
    ...n,
    x: posMap.get(n.id)?.x ?? 0,
    y: posMap.get(n.id)?.y ?? 0,
  }));
}


// ── Avatar ───────────────────────────────────────────────────────────────────

function Avatar({
  src, name, size = 52, ghost = false,
}: {
  src?: string | null; name: string; size?: number; ghost?: boolean;
}) {
  const initials = name.split(" ").map((w) => w[0] ?? "").join("").toUpperCase().slice(0, 2);
  if (src && !ghost) {
    return (
      <img
        src={src}
        alt={name}
        style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }}
      />
    );
  }
  return (
    <div
      style={{
        width: size, height: size, borderRadius: "50%", flexShrink: 0,
        background: ghost
          ? "rgba(255,255,255,0.06)"
          : "linear-gradient(135deg, #4a7a5e, #7ab89a)",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: size * 0.3, fontWeight: 700,
        color: ghost ? "rgba(237,232,226,0.3)" : "white",
        border: ghost ? "1.5px dashed rgba(255,255,255,0.15)" : "none",
      }}
    >
      {ghost ? "?" : initials}
    </div>
  );
}

// ── Relation label helper ────────────────────────────────────────────────────

function relationLabel(rel: string): string {
  switch (rel) {
    case "parent":      return "Parent / Child";
    case "spouse":      return "Spouse";
    case "sibling":     return "Sibling";
    case "grandparent": return "Grandparent";
    default:            return rel;
  }
}

function relationColor(rel: string): string {
  switch (rel) {
    case "parent":      return "rgba(90,158,114,0.7)";
    case "spouse":      return "rgba(201,120,58,0.7)";
    case "sibling":     return "rgba(100,140,200,0.7)";
    case "grandparent": return "rgba(180,130,200,0.7)";
    default:            return "rgba(200,200,200,0.4)";
  }
}

// ── Main Page ────────────────────────────────────────────────────────────────

export default function FamilyTreePage() {
  const searchParams  = useSearchParams();
  const router        = useRouter();
  const groupId       = searchParams.get("groupId");
  const containerRef  = useRef<HTMLDivElement>(null);

  const [nodes,     setNodes]     = useState<PositionedNode[]>([]);
  const [edges,     setEdges]     = useState<TreeEdge[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState("");
  const [selected,  setSelected]  = useState<PositionedNode | null>(null);
  const [transform, setTransform] = useState({ x: 400, y: 300, scale: 1 });
  const [dragging,  setDragging]  = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // ── Fetch ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!groupId) {
      setError("No group ID found. Please go back to the dashboard.");
      setLoading(false);
      return;
    }

    fetch(`/api/family-tree?groupId=${groupId}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) { setError(d.error); setLoading(false); return; }

        const positioned = layoutNodes(d.nodes ?? [], d.edges ?? []);
        setNodes(positioned);
        setEdges(d.edges ?? []);

        // Centre viewport on current user
        const me = positioned.find((n) => n.isCurrentUser);
        if (me && containerRef.current) {
          const { offsetWidth: w, offsetHeight: h } = containerRef.current;
          setTransform({
            x: w / 2 - me.x - NODE_W / 2,
            y: h / 2 - me.y - NODE_H / 2,
            scale: 1,
          });
        }
        setLoading(false);
      })
      .catch(() => { setError("Failed to load family tree."); setLoading(false); });
  }, [groupId]);

  // ── Pan ────────────────────────────────────────────────────────────────────
  const onMouseDown = (e: React.MouseEvent) => {
    if ((e.target as Element).closest("[data-node]")) return;
    setDragging(true);
    setDragStart({ x: e.clientX - transform.x, y: e.clientY - transform.y });
  };
  const onMouseMove = (e: React.MouseEvent) => {
    if (!dragging) return;
    setTransform((t) => ({ ...t, x: e.clientX - dragStart.x, y: e.clientY - dragStart.y }));
  };
  const onMouseUp = () => setDragging(false);

  // Touch pan support
  const lastTouch = useRef<{ x: number; y: number } | null>(null);
  const onTouchStart = (e: React.TouchEvent) => {
    lastTouch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  };
  const onTouchMove = (e: React.TouchEvent) => {
    if (!lastTouch.current) return;
    const dx = e.touches[0].clientX - lastTouch.current.x;
    const dy = e.touches[0].clientY - lastTouch.current.y;
    setTransform((t) => ({ ...t, x: t.x + dx, y: t.y + dy }));
    lastTouch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  };

  // ── Zoom ───────────────────────────────────────────────────────────────────
  const onWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setTransform((t) => ({ ...t, scale: Math.min(2.5, Math.max(0.25, t.scale * delta)) }));
  };
  const zoomIn    = () => setTransform((t) => ({ ...t, scale: Math.min(2.5, t.scale * 1.2) }));
  const zoomOut   = () => setTransform((t) => ({ ...t, scale: Math.max(0.25, t.scale * 0.8) }));
  const resetView = () => {
    const me = nodes.find((n) => n.isCurrentUser);
    if (me && containerRef.current) {
      const { offsetWidth: w, offsetHeight: h } = containerRef.current;
      setTransform({ x: w / 2 - me.x - NODE_W / 2, y: h / 2 - me.y - NODE_H / 2, scale: 1 });
    }
  };

  // ── Helpers ────────────────────────────────────────────────────────────────
  const getMyRelationTo = (nodeId: string): string | null => {
    const me   = nodes.find((n) => n.isCurrentUser);
    if (!me) return null;
    const edge = edges.find(
      (e) => (e.from === me.id && e.to === nodeId) || (e.to === me.id && e.from === nodeId)
    );
    return edge ? relationLabel(edge.relation) : null;
  };

  const getConnections = (nodeId: string) =>
    edges
      .filter((e) => e.from === nodeId || e.to === nodeId)
      .map((e) => {
        const otherId = e.from === nodeId ? e.to : e.from;
        return { node: nodes.find((n) => n.id === otherId), relation: relationLabel(e.relation), confirmed: e.confirmed };
      })
      .filter((c) => c.node);

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="root">
      {/* Top bar */}
      <div className="topbar">
        <button className="back-btn" onClick={() => router.push("/dashboard")}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5M12 5l-7 7 7 7"/>
          </svg>
          Dashboard
        </button>

        <span className="tree-title">🌳 Family Tree</span>

        <button
          className="edit-btn"
          onClick={() => router.push(`/family-profile?groupId=${groupId}`)}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
          </svg>
          Edit Family Profile
        </button>
      </div>

      {/* Canvas */}
      <div
        ref={containerRef}
        className="canvas"
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
        onWheel={onWheel}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={() => { lastTouch.current = null; }}
        onClick={() => setSelected(null)}
        style={{ cursor: dragging ? "grabbing" : "grab" }}
      >
        {/* Loading */}
        {loading && (
          <div className="center-state">
            <div className="spinner" />
            <p>Growing your family tree…</p>
          </div>
        )}

        {/* Error */}
        {!loading && error && (
          <div className="center-state">
            <div className="error-icon">⚠️</div>
            <p className="error-text">{error}</p>
            <button className="btn-primary" onClick={() => router.push("/dashboard")}>
              Back to Dashboard
            </button>
          </div>
        )}

        {/* Empty — no family profile filled yet */}
        {!loading && !error && nodes.length === 0 && (
          <div className="center-state">
            <div style={{ fontSize: 52 }}>🌱</div>
            <h2 className="empty-title">Your tree is empty</h2>
            <p className="empty-sub">Fill in your family profile to start building the tree.</p>
            <button
              className="btn-primary"
              onClick={() => router.push(`/family-profile?groupId=${groupId}`)}
            >
              Fill Family Profile →
            </button>
          </div>
        )}

        {/* Tree SVG */}
        {!loading && !error && nodes.length > 0 && (
          <svg width="100%" height="100%" style={{ overflow: "visible" }}>
            <defs>
              <filter id="glow-green">
                <feGaussianBlur stdDeviation="4" result="blur"/>
                <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
              </filter>
              <filter id="glow-ghost">
                <feGaussianBlur stdDeviation="2" result="blur"/>
                <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
              </filter>
            </defs>

            <g transform={`translate(${transform.x}, ${transform.y}) scale(${transform.scale})`}>

              {/* ── Edges — clean hierarchical connectors ── */}
              {(() => {
                const SPOUSE_COLOR = "rgba(201,120,58,0.85)";
                const CHILD_COLOR  = "rgba(90,158,114,0.75)";
                const SW           = 2;
                const paths: React.ReactNode[] = [];

                // ── Build lookup maps ──────────────────────────────────────
                const partnerOf = new Map<string, string>();
                edges.filter((e) => e.relation === "spouse").forEach((e) => {
                  partnerOf.set(e.from, e.to);
                  partnerOf.set(e.to,   e.from);
                });

                // ── Collect children per COUPLE using positioned nodes ─────
                // Strategy: for each child node, find ALL parents from edges.
                // Then pick the canonical couple key (sorted parent IDs).
                // This way it doesn't matter which parent edge is processed first
                // — the same couple key is always generated.
                const childrenOfCouple = new Map<string, string[]>();
                const childrenOfSingle = new Map<string, string[]>();
                const assignedChild    = new Set<string>();

                const parentEdges = edges.filter(
                  (e) => e.relation === "parent" || e.relation === "grandparent"
                );

                // Build: childId → all parentIds from edges
                const allParentsOfChild = new Map<string, string[]>();
                parentEdges.forEach((e) => {
                  if (!allParentsOfChild.has(e.to)) allParentsOfChild.set(e.to, []);
                  if (!allParentsOfChild.get(e.to)!.includes(e.from))
                    allParentsOfChild.get(e.to)!.push(e.from);
                });

                // For each child, determine its couple/single parent group
                allParentsOfChild.forEach((parentIds, childId) => {
                  if (assignedChild.has(childId)) return;

                  // Find the primary parent — one that exists as a node
                  const knownParents = parentIds.filter((pid) =>
                    nodes.find((n) => n.id === pid)
                  );

                  if (knownParents.length === 0) return;

                  // Check if any known parent has a partner
                  let coupleKey: string | null = null;
                  for (const pid of knownParents) {
                    const partner = partnerOf.get(pid);
                    if (partner && nodes.find((n) => n.id === partner)) {
                      // Use sorted couple key so Test4+Test8 always = same key
                      coupleKey = [pid, partner].sort().join("|");
                      break;
                    }
                  }

                  if (coupleKey) {
                    if (!childrenOfCouple.has(coupleKey)) childrenOfCouple.set(coupleKey, []);
                    if (!childrenOfCouple.get(coupleKey)!.includes(childId))
                      childrenOfCouple.get(coupleKey)!.push(childId);
                  } else {
                    const pid = knownParents[0];
                    if (!childrenOfSingle.has(pid)) childrenOfSingle.set(pid, []);
                    if (!childrenOfSingle.get(pid)!.includes(childId))
                      childrenOfSingle.get(pid)!.push(childId);
                  }
                  assignedChild.add(childId);
                });

                // Helper: draw the T-bar from a midpoint down to a list of children
                const drawChildDrop = (
                  fromX: number, fromY: number,
                  children: PositionedNode[], keyPrefix: string
                ) => {
                  if (children.length === 0) return;
                  const childTopY = Math.min(...children.map((c) => c.y));
                  const barY      = fromY + (childTopY - fromY) * 0.5;

                  // Vertical line from source down to bar
                  paths.push(
                    <line key={`${keyPrefix}-vdrop`}
                      x1={fromX} y1={fromY} x2={fromX} y2={barY}
                      stroke={CHILD_COLOR} strokeWidth={SW} />
                  );

                  if (children.length === 1) {
                    // Single child — elbow: horizontal then vertical
                    const cx = children[0].x + NODE_W / 2;
                    if (cx !== fromX) {
                      paths.push(
                        <line key={`${keyPrefix}-elbow-h`}
                          x1={fromX} y1={barY} x2={cx} y2={barY}
                          stroke={CHILD_COLOR} strokeWidth={SW} />
                      );
                    }
                    paths.push(
                      <line key={`${keyPrefix}-elbow-v`}
                        x1={cx} y1={barY} x2={cx} y2={children[0].y}
                        stroke={CHILD_COLOR} strokeWidth={SW} />
                    );
                  } else {
                    // Multiple children — horizontal bar spanning all, then drops
                    const xs  = children.map((c) => c.x + NODE_W / 2);
                    const x1h = Math.min(...xs);
                    const x2h = Math.max(...xs);
                    paths.push(
                      <line key={`${keyPrefix}-hbar`}
                        x1={x1h} y1={barY} x2={x2h} y2={barY}
                        stroke={CHILD_COLOR} strokeWidth={SW} />
                    );
                    children.forEach((child, ci) => {
                      const cx = child.x + NODE_W / 2;
                      paths.push(
                        <line key={`${keyPrefix}-drop-${ci}`}
                          x1={cx} y1={barY} x2={cx} y2={child.y}
                          stroke={CHILD_COLOR} strokeWidth={SW} />
                      );
                    });
                  }
                };

                // ── Draw spouse lines ──────────────────────────────────────
                const drawnSpouses = new Set<string>();
                edges.filter((e) => e.relation === "spouse").forEach((e, i) => {
                  const pairKey = [e.from, e.to].sort().join("|");
                  if (drawnSpouses.has(pairKey)) return;
                  drawnSpouses.add(pairKey);

                  const a = nodes.find((n) => n.id === e.from);
                  const b = nodes.find((n) => n.id === e.to);
                  if (!a || !b) return;

                  const [left, right] = a.x <= b.x ? [a, b] : [b, a];
                  const lineY = left.y + NODE_H / 2;
                  const x1s   = left.x  + NODE_W;
                  const x2s   = right.x;
                  const mx    = left.x + NODE_W + COUPLE_GAP / 2;

                  paths.push(
                    <g key={`spouse-${pairKey}`}>
                      <line x1={x1s} y1={lineY} x2={x2s} y2={lineY}
                        stroke={SPOUSE_COLOR} strokeWidth={SW}
                        strokeDasharray={e.confirmed ? "none" : "6,4"}
                        opacity={e.confirmed ? 1 : 0.45} />
                      <circle cx={mx} cy={lineY} r="4"
                        fill={SPOUSE_COLOR} opacity="1" />
                    </g>
                  );
                });

                // ── Draw couple → children ────────────────────────────────
                childrenOfCouple.forEach((childIds, coupleKey) => {
                  const [idA, idB] = coupleKey.split("|");
                  const a = nodes.find((n) => n.id === idA);
                  const b = nodes.find((n) => n.id === idB);
                  if (!a || !b) return;

                  const children = childIds
                    .map((id) => nodes.find((n) => n.id === id))
                    .filter(Boolean) as PositionedNode[];
                  if (children.length === 0) return;

                  const [left] = a.x <= b.x ? [a, b] : [b, a];
                  const mx     = left.x + NODE_W + COUPLE_GAP / 2;
                  const fromY  = left.y + NODE_H / 2; // centre of spouse line

                  drawChildDrop(mx, fromY, children, `couple-${coupleKey}`);
                });

                // ── Draw single parent → children ─────────────────────────
                childrenOfSingle.forEach((childIds, parentId) => {
                  const parent = nodes.find((n) => n.id === parentId);
                  if (!parent) return;

                  const children = childIds
                    .map((id) => nodes.find((n) => n.id === id))
                    .filter(Boolean) as PositionedNode[];
                  if (children.length === 0) return;

                  const fromX = parent.x + NODE_W / 2;
                  const fromY = parent.y + NODE_H;

                  drawChildDrop(fromX, fromY, children, `single-${parentId}`);
                });

                return paths;
              })()}

              {/* ── Nodes ── */}
              {nodes.map((node) => {
                const isSelected = selected?.id === node.id;
                const myRelation = getMyRelationTo(node.id);

                return (
                  <g
                    key={node.id}
                    data-node="true"
                    transform={`translate(${node.x}, ${node.y})`}
                    onClick={(e) => { e.stopPropagation(); setSelected(isSelected ? null : node); }}
                    style={{ cursor: "pointer" }}
                  >
                    {/* Card */}
                    <rect
                      width={NODE_W}
                      height={NODE_H}
                      rx="18"
                      fill={
                        node.isGhost        ? "rgba(255,255,255,0.02)" :
                        node.isCurrentUser  ? "rgba(90,158,114,0.14)"  :
                                              "rgba(255,255,255,0.05)"
                      }
                      stroke={
                        node.isGhost        ? "rgba(255,255,255,0.08)" :
                        node.isCurrentUser  ? "rgba(90,158,114,0.55)"  :
                        isSelected          ? "rgba(201,120,58,0.6)"   :
                                              "rgba(255,255,255,0.1)"
                      }
                      strokeWidth={node.isCurrentUser || isSelected ? "1.5" : "1"}
                      strokeDasharray={node.isGhost ? "5,3" : "none"}
                      filter={node.isCurrentUser ? "url(#glow-green)" : node.isGhost ? "url(#glow-ghost)" : "none"}
                    />

                    {/* Avatar */}
                    <foreignObject x={(NODE_W - 54) / 2} y="14" width="54" height="54">
                      <div
                        style={{
                          borderRadius: "50%", overflow: "hidden",
                          width: 54, height: 54,
                          border: node.isCurrentUser
                            ? "2px solid rgba(90,158,114,0.7)"
                            : node.isGhost
                            ? "2px dashed rgba(255,255,255,0.15)"
                            : "2px solid rgba(255,255,255,0.1)",
                        }}
                      >
                        <Avatar src={node.profilePhoto} name={node.name} size={54} ghost={node.isGhost} />
                      </div>
                    </foreignObject>

                    {/* Name — first word */}
                    <text
                      x={NODE_W / 2} y="86"
                      textAnchor="middle"
                      fontSize="11" fontWeight="700"
                      fill={node.isGhost ? "rgba(237,232,226,0.3)" : node.isCurrentUser ? "#8fd3a8" : "#ede8e2"}
                      fontFamily="'Plus Jakarta Sans', sans-serif"
                    >
                      {node.name.split(" ")[0]}
                    </text>

                    {/* Name — rest */}
                    {node.name.split(" ").length > 1 && (
                      <text
                        x={NODE_W / 2} y="99"
                        textAnchor="middle"
                        fontSize="9" fontWeight="500"
                        fill={node.isGhost ? "rgba(237,232,226,0.2)" : "rgba(237,232,226,0.45)"}
                        fontFamily="'Plus Jakarta Sans', sans-serif"
                      >
                        {node.name.split(" ").slice(1).join(" ")}
                      </text>
                    )}

                    {/* Badge: You / relation / ghost */}
                    {node.isCurrentUser && (
                      <g>
                        <rect x={(NODE_W - 36) / 2} y="110" width="36" height="18" rx="9"
                          fill="rgba(90,158,114,0.25)" stroke="rgba(90,158,114,0.5)" strokeWidth="1"/>
                        <text x={NODE_W / 2} y="122" textAnchor="middle"
                          fontSize="8" fontWeight="700" fill="#8fd3a8"
                          fontFamily="'Plus Jakarta Sans', sans-serif">You</text>
                      </g>
                    )}

                    {!node.isCurrentUser && !node.isGhost && myRelation && (
                      <g>
                        <rect x={(NODE_W - 90) / 2} y="110" width="90" height="18" rx="9"
                          fill="rgba(201,120,58,0.12)" stroke="rgba(201,120,58,0.3)" strokeWidth="1"/>
                        <text x={NODE_W / 2} y="122" textAnchor="middle"
                          fontSize="8" fontWeight="600" fill="#d4956a"
                          fontFamily="'Plus Jakarta Sans', sans-serif">
                          {myRelation}
                        </text>
                      </g>
                    )}

                    {node.isGhost && (
                      <g>
                        <rect x={(NODE_W - 66) / 2} y="110" width="66" height="18" rx="9"
                          fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.1)" strokeWidth="1"
                          strokeDasharray="3,2"/>
                        <text x={NODE_W / 2} y="122" textAnchor="middle"
                          fontSize="8" fontWeight="600" fill="rgba(237,232,226,0.25)"
                          fontFamily="'Plus Jakarta Sans', sans-serif">Not joined yet</text>
                      </g>
                    )}

                    {/* Selected highlight ring */}
                    {isSelected && (
                      <rect
                        x="-3" y="-3"
                        width={NODE_W + 6} height={NODE_H + 6}
                        rx="21"
                        fill="none"
                        stroke="rgba(201,120,58,0.4)"
                        strokeWidth="1.5"
                        strokeDasharray="6,3"
                      />
                    )}
                  </g>
                );
              })}
            </g>
          </svg>
        )}
      </div>

      {/* Zoom controls */}
      <div className="zoom-controls">
        <button className="zoom-btn" onClick={zoomIn}>+</button>
        <button className="zoom-btn reset" onClick={resetView}>⌂</button>
        <button className="zoom-btn" onClick={zoomOut}>−</button>
      </div>

      {/* Legend */}
      <div className="legend">
        {[
          { label: "Parent/Child", color: "rgba(90,158,114,0.7)" },
          { label: "Spouse",       color: "rgba(201,120,58,0.7)" },
          { label: "Sibling",      color: "rgba(100,140,200,0.7)" },
          { label: "Grandparent",  color: "rgba(180,130,200,0.7)" },
        ].map((l) => (
          <div key={l.label} className="legend-item">
            <div className="legend-dot" style={{ background: l.color }} />
            <span>{l.label}</span>
          </div>
        ))}
        <div className="legend-item">
          <div className="legend-dash" />
          <span>Unconfirmed</span>
        </div>
      </div>

      {/* Detail panel */}
      {selected && (
        <div className="detail-panel" onClick={(e) => e.stopPropagation()}>
          <button className="panel-close" onClick={() => setSelected(null)}>×</button>

          <div className="panel-avatar-wrap">
            <Avatar src={selected.profilePhoto} name={selected.name} size={64} ghost={selected.isGhost} />
            {selected.isCurrentUser && <div className="you-badge">You</div>}
            {selected.isGhost && <div className="ghost-badge">Pending</div>}
          </div>

          <h3 className="panel-name">{selected.name}</h3>

          {getMyRelationTo(selected.id) && !selected.isCurrentUser && (
            <div className="panel-rel-badge">Your {getMyRelationTo(selected.id)}</div>
          )}

          {selected.isGhost && (
            <p className="panel-ghost-note">
              This person hasn't joined the group yet. Once they sign up and fill their family profile, they'll appear here.
            </p>
          )}

          {selected.bio && !selected.isGhost && (
            <p className="panel-bio">{selected.bio}</p>
          )}

          {selected.dateOfBirth && !selected.isGhost && (
            <div className="panel-dob">
              🎂 {new Date(selected.dateOfBirth).toLocaleDateString("en-IN", {
                day: "numeric", month: "long", year: "numeric",
              })}
            </div>
          )}

          {getConnections(selected.id).length > 0 && (
            <div className="panel-connections">
              <p className="conn-title">Connections</p>
              {getConnections(selected.id).map((c, i) => (
                <div key={i} className="conn-item">
                  <Avatar src={c.node!.profilePhoto} name={c.node!.name} size={26} ghost={c.node!.isGhost} />
                  <span className="conn-name">{c.node!.name.split(" ")[0]}</span>
                  <span className="conn-rel">{c.relation}</span>
                  {!c.confirmed && <span className="conn-unconf">?</span>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <style jsx>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:wght@500;600&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap');
        * { box-sizing: border-box; }

        .root {
          width: 100vw; height: 100vh;
          background: #0b0e13;
          font-family: 'Plus Jakarta Sans', sans-serif;
          color: #ede8e2;
          overflow: hidden; position: relative;
          background-image:
            radial-gradient(ellipse 60% 50% at 15% 15%, rgba(90,158,114,0.06) 0%, transparent 55%),
            radial-gradient(ellipse 50% 60% at 85% 85%, rgba(201,120,58,0.05) 0%, transparent 55%);
        }

        /* Topbar */
        .topbar {
          position: absolute; top: 0; left: 0; right: 0; z-index: 20;
          display: flex; align-items: center; justify-content: space-between;
          padding: 14px 24px;
          background: rgba(11,14,19,0.85);
          backdrop-filter: blur(14px);
          border-bottom: 1px solid rgba(255,255,255,0.06);
        }
        .back-btn {
          display: flex; align-items: center; gap: 7px;
          background: none; border: none;
          color: rgba(237,232,226,0.45);
          font-family: 'Plus Jakarta Sans', sans-serif;
          font-size: 13px; font-weight: 500; cursor: pointer;
          padding: 6px 12px; border-radius: 8px; transition: all 0.2s;
        }
        .back-btn:hover { color: #ede8e2; background: rgba(255,255,255,0.05); }
        .tree-title {
          font-family: 'Fraunces', serif;
          font-size: 17px; font-weight: 600; color: #ede8e2;
        }
        .edit-btn {
          display: flex; align-items: center; gap: 7px;
          padding: 8px 16px;
          background: rgba(90,158,114,0.1);
          border: 1px solid rgba(90,158,114,0.25);
          border-radius: 10px; color: #8fd3a8;
          font-family: 'Plus Jakarta Sans', sans-serif;
          font-size: 13px; font-weight: 500; cursor: pointer; transition: all 0.2s;
        }
        .edit-btn:hover { background: rgba(90,158,114,0.18); }

        /* Canvas */
        .canvas {
          width: 100%; height: 100%;
          padding-top: 58px;
          position: relative; user-select: none;
        }

        /* Center states */
        .center-state {
          display: flex; flex-direction: column;
          align-items: center; justify-content: center;
          height: 100%; gap: 14px;
          color: rgba(237,232,226,0.4);
        }
        .spinner {
          width: 34px; height: 34px;
          border: 2.5px solid rgba(90,158,114,0.2);
          border-top-color: #5a9e72;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        .empty-title { font-family: 'Fraunces', serif; font-size: 22px; color: rgba(237,232,226,0.6); margin: 0; }
        .empty-sub { font-size: 14px; color: rgba(237,232,226,0.3); margin: 0; text-align: center; max-width: 300px; }
        .error-icon { font-size: 36px; }
        .error-text { font-size: 14px; color: rgba(255,100,100,0.7); text-align: center; max-width: 320px; margin: 0; }
        .btn-primary {
          padding: 11px 22px;
          background: linear-gradient(135deg, #5a9e72, #8fd3a8);
          color: #0b0e13; border: none; border-radius: 12px;
          font-family: 'Plus Jakarta Sans', sans-serif;
          font-size: 14px; font-weight: 600; cursor: pointer;
          transition: opacity 0.2s;
        }
        .btn-primary:hover { opacity: 0.88; }

        /* Zoom controls */
        .zoom-controls {
          position: absolute; bottom: 28px; right: 24px; z-index: 20;
          display: flex; flex-direction: column; gap: 6px;
        }
        .zoom-btn {
          width: 38px; height: 38px;
          background: rgba(255,255,255,0.07);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 10px;
          color: rgba(237,232,226,0.7);
          font-size: 18px; cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          transition: all 0.2s; backdrop-filter: blur(8px);
        }
        .zoom-btn:hover { background: rgba(255,255,255,0.12); color: #ede8e2; }
        .zoom-btn.reset { font-size: 15px; }

        /* Legend */
        .legend {
          position: absolute; bottom: 28px; left: 24px; z-index: 20;
          display: flex; flex-direction: column; gap: 6px;
          background: rgba(11,14,19,0.75);
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 12px; padding: 10px 14px;
          backdrop-filter: blur(10px);
        }
        .legend-item {
          display: flex; align-items: center; gap: 7px;
          font-size: 11px; color: rgba(237,232,226,0.45);
        }
        .legend-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
        .legend-dash {
          width: 14px; height: 2px; flex-shrink: 0;
          background: rgba(255,255,255,0.3);
          border-radius: 1px;
          background-image: repeating-linear-gradient(90deg, rgba(255,255,255,0.4) 0px, rgba(255,255,255,0.4) 4px, transparent 4px, transparent 7px);
        }

        /* Detail panel */
        .detail-panel {
          position: absolute; top: 72px; right: 24px; z-index: 30;
          width: 268px;
          background: rgba(15,18,26,0.97);
          border: 1px solid rgba(255,255,255,0.09);
          border-radius: 22px; padding: 24px;
          backdrop-filter: blur(24px);
          box-shadow: 0 24px 64px rgba(0,0,0,0.55);
          display: flex; flex-direction: column; gap: 12px;
          animation: panelIn 0.22s ease;
        }
        @keyframes panelIn {
          from { opacity: 0; transform: translateX(10px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        .panel-close {
          position: absolute; top: 14px; right: 14px;
          width: 28px; height: 28px;
          background: rgba(255,255,255,0.06); border: none; border-radius: 8px;
          color: rgba(237,232,226,0.5); font-size: 18px; cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          transition: all 0.2s;
        }
        .panel-close:hover { background: rgba(255,255,255,0.1); color: #ede8e2; }
        .panel-avatar-wrap {
          display: flex; justify-content: center; position: relative; padding-bottom: 4px;
        }
        .you-badge {
          position: absolute; bottom: 0; left: 50%; transform: translateX(18px);
          background: rgba(90,158,114,0.85); color: white;
          font-size: 9px; font-weight: 700; padding: 2px 7px; border-radius: 999px;
        }
        .ghost-badge {
          position: absolute; bottom: 0; left: 50%; transform: translateX(18px);
          background: rgba(255,255,255,0.1); color: rgba(237,232,226,0.5);
          font-size: 9px; font-weight: 600; padding: 2px 7px; border-radius: 999px;
          border: 1px dashed rgba(255,255,255,0.2);
        }
        .panel-name {
          font-family: 'Fraunces', serif;
          font-size: 18px; font-weight: 600;
          color: #ede8e2; margin: 0; text-align: center;
        }
        .panel-rel-badge {
          align-self: center;
          padding: 4px 14px;
          background: rgba(201,120,58,0.1);
          border: 1px solid rgba(201,120,58,0.25);
          border-radius: 999px;
          font-size: 12px; font-weight: 600; color: #d4956a;
        }
        .panel-ghost-note {
          font-size: 12px; color: rgba(237,232,226,0.3);
          text-align: center; line-height: 1.6; margin: 0;
          padding: 10px; background: rgba(255,255,255,0.03);
          border-radius: 10px; border: 1px dashed rgba(255,255,255,0.08);
        }
        .panel-bio {
          font-size: 12px; color: rgba(237,232,226,0.4);
          text-align: center; margin: 0; line-height: 1.6;
        }
        .panel-dob {
          font-size: 12px; color: rgba(237,232,226,0.4); text-align: center;
        }
        .panel-connections { display: flex; flex-direction: column; gap: 6px; }
        .conn-title {
          font-size: 10px; font-weight: 700; color: rgba(237,232,226,0.3);
          text-transform: uppercase; letter-spacing: 0.1em; margin: 0;
        }
        .conn-item {
          display: flex; align-items: center; gap: 8px;
          font-size: 12px; color: rgba(237,232,226,0.6);
        }
        .conn-name { flex: 1; }
        .conn-rel { font-size: 11px; color: #d4956a; font-weight: 600; }
        .conn-unconf {
          font-size: 10px; color: rgba(237,232,226,0.3);
          background: rgba(255,255,255,0.06);
          border-radius: 4px; padding: 1px 5px;
        }
      `}</style>
    </div>
  );
}