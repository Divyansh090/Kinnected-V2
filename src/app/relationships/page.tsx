"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

const RELATIONS = [
  "Father", "Mother", "Son", "Daughter",
  "Brother", "Sister", "Grandfather", "Grandmother",
  "Grandchild", "Uncle", "Aunt", "Nephew", "Niece",
  "Cousin", "Husband", "Wife", "Spouse", "Other",
];

interface Member {
  id: string;
  name: string;
  profilePhoto: string | null;
  bio: string | null;
  existingRelation: string | null;
}

function Avatar({ src, name, size = 48 }: { src?: string | null; name: string; size?: number }) {
  const initials = name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
  if (src) return <img src={src} alt={name} style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />;
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%", flexShrink: 0,
      background: "linear-gradient(135deg, #b06a3a, #d4956a)",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: size * 0.33, fontWeight: 700, color: "white",
    }}>{initials}</div>
  );
}

export default function RelationshipsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const groupId = searchParams.get("groupId");

  const [members, setMembers] = useState<Member[]>([]);
  const [relations, setRelations] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);

  useEffect(() => {
    if (!groupId) return;
    fetch(`/api/relationships?groupId=${groupId}`)
      .then((r) => r.json())
      .then((d) => {
        setMembers(d.members || []);
        const map: Record<string, string> = {};
        d.members?.forEach((m: Member) => {
          if (m.existingRelation) map[m.id] = m.existingRelation;
        });
        setRelations(map);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [groupId]);

  const setRelation = (memberId: string, relation: string) => {
    setRelations((prev) => ({ ...prev, [memberId]: relation }));
    setActiveDropdown(null);
  };

  const handleSave = async () => {
    setSaving(true);
    setError("");
    try {
      const payload = Object.entries(relations).map(([toUserId, relation]) => ({ toUserId, relation }));
      const res = await fetch("/api/relationships", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ groupId, relationships: payload }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      router.push(`/family-tree?groupId=${groupId}`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const completedCount = Object.keys(relations).length;
  const progress = members.length > 0 ? (completedCount / members.length) * 100 : 0;

  return (
    <div className="root" onClick={() => setActiveDropdown(null)}>
      {/* Ambient background */}
      <div className="ambient" />

      <div className="container">
        {/* Header */}
        <div className="header">
          <div className="header-left">
            <div className="step-badge">Step 3 of 3</div>
            <h1 className="title">Map your relationships</h1>
            <p className="subtitle">
              Tell us how you're connected to each family member. This builds your family tree.
            </p>
          </div>
          <div className="progress-ring-wrap">
            <svg width="72" height="72" viewBox="0 0 72 72">
              <circle cx="36" cy="36" r="30" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="5" />
              <circle
                cx="36" cy="36" r="30" fill="none"
                stroke="#c9783a" strokeWidth="5"
                strokeDasharray={`${2 * Math.PI * 30}`}
                strokeDashoffset={`${2 * Math.PI * 30 * (1 - progress / 100)}`}
                strokeLinecap="round"
                transform="rotate(-90 36 36)"
                style={{ transition: "stroke-dashoffset 0.4s ease" }}
              />
            </svg>
            <div className="progress-label">
              <span className="progress-num">{completedCount}</span>
              <span className="progress-den">/{members.length}</span>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="loading">
            <div className="spinner" />
            <p>Loading family members...</p>
          </div>
        ) : members.length === 0 ? (
          <div className="no-members">
            <p>🏠 You're the first member! Invite others to set up relationships.</p>
            <button className="btn-primary" onClick={() => router.push("/dashboard")}>
              Go to Dashboard →
            </button>
          </div>
        ) : (
          <>
            <div className="members-list">
              {members.map((member, i) => (
                <div
                  key={member.id}
                  className="member-row"
                  style={{ animationDelay: `${i * 0.06}s` }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="member-info">
                    <Avatar src={member.profilePhoto} name={member.name} size={48} />
                    <div>
                      <p className="member-name">{member.name}</p>
                      {member.bio && <p className="member-bio">{member.bio}</p>}
                    </div>
                  </div>

                  <div className="relation-selector">
                    <div className="relation-connector">
                      <span className="connector-you">You</span>
                      <div className="connector-line">
                        <div className="connector-arrow">→</div>
                      </div>
                      <span className="connector-are">are</span>
                    </div>

                    <div className="dropdown-wrap">
                      <button
                        className={`relation-btn ${relations[member.id] ? "selected" : ""}`}
                        onClick={() => setActiveDropdown(activeDropdown === member.id ? null : member.id)}
                      >
                        {relations[member.id] ? (
                          <span className="relation-value">{relations[member.id]}</span>
                        ) : (
                          <span className="relation-placeholder">Select relation…</span>
                        )}
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
                          style={{ transform: activeDropdown === member.id ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s" }}>
                          <path d="M6 9l6 6 6-6"/>
                        </svg>
                      </button>

                      {activeDropdown === member.id && (
                        <div className="dropdown-menu">
                          {RELATIONS.map((r) => (
                            <button
                              key={r}
                              className={`dropdown-item ${relations[member.id] === r ? "active" : ""}`}
                              onClick={() => setRelation(member.id, r)}
                            >
                              {r}
                              {relations[member.id] === r && (
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                  <path d="M20 6L9 17l-5-5"/>
                                </svg>
                              )}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="connector-to">
                      <span className="connector-name">{member.name.split(" ")[0]}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {error && <p className="error">{error}</p>}

            <div className="footer">
              <button className="btn-ghost" onClick={() => router.push("/dashboard")}>
                Skip for now
              </button>
              <button className="btn-primary" onClick={handleSave} disabled={saving || completedCount === 0}>
                {saving ? <span className="btn-spinner" /> : (
                  <>
                    Save & View Family Tree
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M5 12h14M12 5l7 7-7 7"/>
                    </svg>
                  </>
                )}
              </button>
            </div>
          </>
        )}
      </div>

      <style jsx>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,wght@0,600;1,400&family=Plus+Jakarta+Sans:wght@300;400;500;600&display=swap');

        * { box-sizing: border-box; }

        .root {
          min-height: 100vh;
          background: #111318;
          font-family: 'Plus Jakarta Sans', sans-serif;
          color: #ede8e2;
          padding: 40px 24px;
          position: relative;
        }

        .ambient {
          position: fixed; inset: 0; pointer-events: none;
          background:
            radial-gradient(ellipse 60% 50% at 10% 20%, rgba(201,120,58,0.07) 0%, transparent 60%),
            radial-gradient(ellipse 50% 60% at 90% 80%, rgba(90,60,30,0.08) 0%, transparent 60%);
        }

        .container {
          position: relative; z-index: 1;
          max-width: 700px; margin: 0 auto;
          display: flex; flex-direction: column; gap: 32px;
        }

        /* Header */
        .header {
          display: flex; align-items: flex-start;
          justify-content: space-between; gap: 20px;
        }
        .header-left { flex: 1; display: flex; flex-direction: column; gap: 10px; }

        .step-badge {
          display: inline-flex; padding: 4px 12px;
          background: rgba(201,120,58,0.12);
          border: 1px solid rgba(201,120,58,0.25);
          border-radius: 999px;
          font-size: 11px; font-weight: 600;
          color: #c9783a; letter-spacing: 0.06em;
          text-transform: uppercase;
          align-self: flex-start;
        }

        .title {
          font-family: 'Fraunces', serif;
          font-size: 34px; font-weight: 600;
          color: #ede8e2; margin: 0; line-height: 1.15;
        }
        .subtitle {
          font-size: 14px; color: rgba(237,232,226,0.45);
          line-height: 1.7; margin: 0;
        }

        /* Progress ring */
        .progress-ring-wrap {
          position: relative; flex-shrink: 0;
          width: 72px; height: 72px;
        }
        .progress-label {
          position: absolute; inset: 0;
          display: flex; align-items: center; justify-content: center;
        }
        .progress-num { font-size: 18px; font-weight: 700; color: #c9783a; }
        .progress-den { font-size: 12px; color: rgba(237,232,226,0.35); }

        /* Loading */
        .loading {
          display: flex; flex-direction: column; align-items: center;
          gap: 12px; padding: 48px;
          color: rgba(237,232,226,0.4); font-size: 14px;
        }
        .spinner {
          width: 28px; height: 28px;
          border: 2px solid rgba(201,120,58,0.2);
          border-top-color: #c9783a;
          border-radius: 50%;
          animation: spin 0.7s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }

        .no-members {
          text-align: center; padding: 48px;
          display: flex; flex-direction: column; gap: 16px; align-items: center;
          color: rgba(237,232,226,0.5); font-size: 15px;
        }

        /* Members list */
        .members-list {
          display: flex; flex-direction: column; gap: 12px;
        }

        .member-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          padding: 18px 22px;
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: 18px;
          animation: rowIn 0.35s ease both;
          transition: border-color 0.2s;
        }
        .member-row:hover { border-color: rgba(201,120,58,0.2); }

        @keyframes rowIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .member-info {
          display: flex; align-items: center; gap: 14px;
          min-width: 160px;
        }
        .member-name { font-size: 15px; font-weight: 600; color: #ede8e2; margin: 0 0 3px; }
        .member-bio { font-size: 12px; color: rgba(237,232,226,0.35); margin: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 120px; }

        /* Relation selector */
        .relation-selector {
          display: flex; align-items: center; gap: 10px;
          flex: 1; justify-content: flex-end;
        }
        .relation-connector {
          display: flex; align-items: center; gap: 6px;
        }
        .connector-you, .connector-are {
          font-size: 12px; color: rgba(237,232,226,0.3);
          font-weight: 500;
        }
        .connector-line {
          display: flex; align-items: center;
        }
        .connector-arrow { font-size: 14px; color: rgba(201,120,58,0.4); }
        .connector-to { }
        .connector-name {
          font-size: 12px; color: rgba(237,232,226,0.4);
          font-weight: 600;
        }

        /* Dropdown */
        .dropdown-wrap { position: relative; }

        .relation-btn {
          display: flex; align-items: center; gap: 8px;
          padding: 9px 14px;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 10px;
          color: rgba(237,232,226,0.4);
          font-family: 'Plus Jakarta Sans', sans-serif;
          font-size: 13px; cursor: pointer;
          transition: all 0.2s;
          white-space: nowrap;
          min-width: 160px; justify-content: space-between;
        }
        .relation-btn:hover { border-color: rgba(201,120,58,0.3); }
        .relation-btn.selected {
          border-color: rgba(201,120,58,0.4);
          background: rgba(201,120,58,0.08);
          color: #ede8e2;
        }
        .relation-placeholder { color: rgba(237,232,226,0.3); font-style: italic; }
        .relation-value { font-weight: 600; color: #d4956a; }

        .dropdown-menu {
          position: absolute; top: calc(100% + 6px); right: 0;
          width: 180px;
          background: #1c1f27;
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 14px;
          padding: 6px;
          z-index: 50;
          box-shadow: 0 16px 48px rgba(0,0,0,0.5);
          max-height: 260px; overflow-y: auto;
        }
        .dropdown-menu::-webkit-scrollbar { width: 4px; }
        .dropdown-menu::-webkit-scrollbar-track { background: transparent; }
        .dropdown-menu::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 4px; }

        .dropdown-item {
          display: flex; align-items: center; justify-content: space-between;
          width: 100%; padding: 9px 12px;
          background: transparent; border: none;
          border-radius: 9px;
          color: rgba(237,232,226,0.65);
          font-family: 'Plus Jakarta Sans', sans-serif;
          font-size: 13px; font-weight: 500;
          cursor: pointer; text-align: left;
          transition: all 0.15s;
        }
        .dropdown-item:hover { background: rgba(201,120,58,0.1); color: #ede8e2; }
        .dropdown-item.active { background: rgba(201,120,58,0.12); color: #d4956a; }

        /* Footer */
        .footer {
          display: flex; justify-content: flex-end; gap: 12px;
          padding-top: 8px;
        }

        .btn-primary {
          display: flex; align-items: center; gap: 8px;
          padding: 13px 24px;
          background: linear-gradient(135deg, #c9783a, #e8a87c);
          color: white; border: none; border-radius: 14px;
          font-family: 'Plus Jakarta Sans', sans-serif;
          font-size: 14px; font-weight: 600;
          cursor: pointer;
          transition: opacity 0.2s, transform 0.15s;
          box-shadow: 0 8px 24px rgba(201,120,58,0.3);
        }
        .btn-primary:hover { opacity: 0.9; transform: translateY(-1px); }
        .btn-primary:disabled { opacity: 0.4; cursor: not-allowed; transform: none; }

        .btn-ghost {
          padding: 13px 20px;
          background: transparent;
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 14px;
          color: rgba(237,232,226,0.4);
          font-family: 'Plus Jakarta Sans', sans-serif;
          font-size: 14px; cursor: pointer;
          transition: all 0.2s;
        }
        .btn-ghost:hover { border-color: rgba(255,255,255,0.15); color: rgba(237,232,226,0.7); }

        .btn-spinner {
          width: 16px; height: 16px;
          border: 2px solid rgba(255,255,255,0.3);
          border-top-color: white;
          border-radius: 50%;
          animation: spin 0.7s linear infinite;
        }

        .error { color: #ff7b7b; font-size: 13px; text-align: center; }
      `}</style>
    </div>
  );
}