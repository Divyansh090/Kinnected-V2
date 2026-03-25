"use client";

import { useEffect, useState } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";

interface Member {
  user: { id: string; name: string; profilePhoto: string | null };
}

interface Group {
  id: string;
  name: string;
  description: string | null;
  coverPhoto: string | null;
  inviteCode: string;
  admin: { id: string; name: string };
  members: Member[];
}

interface DashboardData {
  user: {
    id: string;
    name: string;
    email: string;
    profilePhoto: string | null;
    bio: string | null;
  };
  hasGroup: boolean;
  groups: Group[];
}

function Avatar({ src, name, size = 40 }: { src?: string | null; name: string; size?: number }) {
  const initials = name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
  if (src) return <img src={src} alt={name} style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />;
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%",
      background: "linear-gradient(135deg, #5a7a6a, #8fb3a0)",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: size * 0.35, fontWeight: 600, color: "white", flexShrink: 0,
    }}>{initials}</div>
  );
}

export default function DashboardPage() {

  const { data: session } = useSession();
  const router = useRouter();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeNav, setActiveNav] = useState("home");
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/dashboard")
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  // ✅ All navigation uses groupId from the fetched data
  const groupId = data?.groups?.[0]?.id ?? null;
  const currentGroup = data?.groups?.[0] ?? null;
  const firstName = data?.user?.name?.split(" ")[0] ?? "there";

  const navigate = (path: string) => router.push(path);

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  // ✅ Sidebar nav items — routes use groupId where needed
  const NAV_ITEMS = [
    {
      id: "home", label: "Home",
      icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>,
      onClick: () => setActiveNav("home"),
    },
    {
      id: "tree", label: "Family Tree",
      icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="4" r="2"/><circle cx="4" cy="20" r="2"/><circle cx="20" cy="20" r="2"/><path d="M12 6v4M12 10c0 0-4 2-4 6M12 10c0 0 4 2 4 6"/></svg>,
      // ✅ Passes groupId
      onClick: () => groupId ? navigate(`/family-tree?groupId=${groupId}`) : alert("Join a group first!"),
    },
    {
      id: "profile-setup", label: "Family Profile",
      icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
      // ✅ Passes groupId
      onClick: () => groupId ? navigate(`/family-profile?groupId=${groupId}`) : alert("Join a group first!"),
    },
    {
      id: "chat", label: "Chat",
      icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>,
      onClick: () => groupId ? navigate(`/chat?groupId=${groupId}`) : alert("Join a group first!"),
    },
    {
      id: "members", label: "Members",
      icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
      onClick: () => groupId ? navigate(`/members?groupId=${groupId}`) : alert("Join a group first!"),
    },
  ];

  // ✅ Quick action buttons — all use groupId
  const QUICK_ACTIONS = groupId ? [
    { label: "Family Tree",    emoji: "🌳", path: `/family-tree?groupId=${groupId}` },
    { label: "Family Profile", emoji: "👨‍👩‍👧", path: `/family-profile?groupId=${groupId}` },
    { label: "Group Chat",     emoji: "💬", path: `/chat?groupId=${groupId}` },
    { label: "Invite Member",  emoji: "➕", path: `/create-group?mode=join` },
  ] : [];
  
  return (
    <div className="shell">
      {/* ── SIDEBAR ── */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div className="logo-mark">K</div>
          <span className="logo-label">innected</span>
        </div>

        <nav className="sidebar-nav">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              className={`nav-item ${activeNav === item.id ? "active" : ""}`}
              onClick={() => { setActiveNav(item.id); item.onClick(); }}
            >
              <span className="nav-icon">{item.icon}</span>
              <span className="nav-label">{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="sidebar-footer">
          {data?.user && (
            <div className="user-pill">
              <Avatar src={data.user.profilePhoto} name={data.user.name} size={34} />
              <div className="user-pill-info">
                <span className="user-pill-name">{data.user.name}</span>
                <span className="user-pill-email">{data.user.email}</span>
              </div>
            </div>
          )}
          <button className="signout-btn" onClick={() => signOut({ callbackUrl: "/signin" })}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16 17 21 12 16 7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
            Sign out
          </button>
        </div>
      </aside>

      {/* ── MAIN ── */}
      <main className="main">
        {loading ? (
          <div className="loading-state">
            <div className="loading-spinner" />
            <p>Loading your family space...</p>
          </div>

        ) : !data?.hasGroup ? (
          /* ── NO GROUP — EMPTY STATE ── */
          <div className="empty-state animate-in">
            <div className="empty-bg-glow" />
            <div className="empty-content">
              <div className="greeting-badge">👋 Welcome to Kinnected</div>
              <h1 className="empty-title">
                Hello, <em>{firstName}</em>.<br />Your family awaits.
              </h1>
              <p className="empty-subtitle">
                Start by creating your family group or joining one with an invite code.
              </p>

              <div className="empty-actions">
                <button className="action-card primary-action" onClick={() => navigate("/create-group")}>
                  <div className="action-icon-wrap">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                      <circle cx="9" cy="7" r="4"/>
                      <line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/>
                    </svg>
                  </div>
                  <div className="action-text">
                    <h3>Create a Family Group</h3>
                    <p>Set up your family's private space and invite everyone.</p>
                  </div>
                  <svg className="action-chevron" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18l6-6-6-6"/></svg>
                </button>

                <button className="action-card" onClick={() => navigate("/create-group?mode=join")}>
                  <div className="action-icon-wrap secondary-icon">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                      <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/>
                      <polyline points="10 17 15 12 10 7"/>
                      <line x1="15" y1="12" x2="3" y2="12"/>
                    </svg>
                  </div>
                  <div className="action-text">
                    <h3>Join with Invite Code</h3>
                    <p>Got a code? Enter it to join your family's group.</p>
                  </div>
                  <svg className="action-chevron" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18l6-6-6-6"/></svg>
                </button>
              </div>

              <div className="empty-illustration">
                <div className="tree-node"><div className="tree-avatar">👴</div><div className="tree-line" /></div>
                <div className="tree-row">
                  <div className="tree-node"><div className="tree-line" /><div className="tree-avatar">👨</div><div className="tree-line" /></div>
                  <div className="tree-node"><div className="tree-line" /><div className="tree-avatar">👩</div><div className="tree-line" /></div>
                </div>
                <div className="tree-row">
                  <div className="tree-node"><div className="tree-avatar small-avatar">👦</div></div>
                  <div className="tree-node"><div className="tree-avatar small-avatar">👧</div></div>
                  <div className="tree-node"><div className="tree-avatar small-avatar">👶</div></div>
                </div>
                <p className="tree-caption">Your family tree will come alive here</p>
              </div>
            </div>
          </div>

        ) : (
          /* ── HAS GROUP ── */
          <div className="dashboard-content animate-in">
            <header className="topbar">
              <div>
                <h1 className="topbar-title">Good to see you, {firstName} 👋</h1>
                <p className="topbar-sub">Here's what's happening in your family</p>
              </div>
              <button className="new-post-btn">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                </svg>
                New Post
              </button>
            </header>

            <div className="dashboard-grid">
              {/* Left col */}
              <div className="left-col">
                {/* Group card */}
                <div className="group-card">
                  {currentGroup?.coverPhoto
                    ? <img src={currentGroup.coverPhoto} alt={currentGroup.name} className="group-cover" />
                    : <div className="group-cover-placeholder">
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                          <circle cx="9" cy="7" r="4"/>
                          <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>
                        </svg>
                      </div>
                  }
                  <div className="group-card-body">
                    <div className="group-card-top">
                      <div>
                        <h2 className="group-name">{currentGroup?.name}</h2>
                        {currentGroup?.description && <p className="group-desc">{currentGroup.description}</p>}
                      </div>
                      <div className="invite-chip">
                        <span className="invite-chip-label">Invite Code</span>
                        <span className="invite-chip-code">{currentGroup?.inviteCode}</span>
                        <button className="invite-copy" onClick={() => copyCode(currentGroup!.inviteCode)}>
                          {copiedCode === currentGroup?.inviteCode ? "✓" : (
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <rect x="9" y="9" width="13" height="13" rx="2"/>
                              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                            </svg>
                          )}
                        </button>
                      </div>
                    </div>

                    <div className="members-preview">
                      <div className="members-avatars">
                        {currentGroup?.members.slice(0, 5).map((m, i) => (
                          <div key={m.user.id} className="member-avatar-wrap" style={{ zIndex: 10 - i }}>
                            <Avatar src={m.user.profilePhoto} name={m.user.name} size={36} />
                          </div>
                        ))}
                        {(currentGroup?.members.length ?? 0) > 5 && (
                          <div className="member-more">+{currentGroup!.members.length - 5}</div>
                        )}
                      </div>
                      <span className="members-count">
                        {currentGroup?.members.length} member{currentGroup?.members.length !== 1 ? "s" : ""}
                      </span>
                    </div>
                  </div>
                </div>

                {/* ✅ Quick actions — all have groupId */}
                <div className="quick-actions">
                  {QUICK_ACTIONS.map((action) => (
                    <button
                      key={action.label}
                      className="quick-btn"
                      onClick={() => navigate(action.path)}
                    >
                      <span className="quick-emoji">{action.emoji}</span>
                      <span className="quick-label">{action.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Right col — Feed */}
              <div className="right-col">
                <div className="feed-header">
                  <h3 className="feed-title">Family Feed</h3>
                  <button className="post-btn">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                    </svg>
                    Post
                  </button>
                </div>
                <div className="feed-empty">
                  <div className="feed-empty-icon">📝</div>
                  <p className="feed-empty-title">No posts yet</p>
                  <p className="feed-empty-sub">Be the first to share something with your family!</p>
                  <button className="feed-post-cta">Write something →</button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      <style jsx>{`
        @import url('https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,500;0,600;1,500&family=Nunito:wght@300;400;500;600&display=swap');
        * { box-sizing: border-box; }
        .shell { display: flex; min-height: 100vh; background: #0e1117; font-family: 'Nunito', sans-serif; color: #e8ede9; }

        /* SIDEBAR */
        .sidebar { width: 240px; background: rgba(255,255,255,0.025); border-right: 1px solid rgba(255,255,255,0.06); display: flex; flex-direction: column; padding: 28px 16px; flex-shrink: 0; position: sticky; top: 0; height: 100vh; }
        .sidebar-logo { display: flex; align-items: center; gap: 8px; padding: 0 8px; margin-bottom: 36px; }
        .logo-mark { width: 36px; height: 36px; background: linear-gradient(135deg, #5a9e72, #8fd3a8); border-radius: 10px; display: flex; align-items: center; justify-content: center; font-family: 'Lora', serif; font-size: 18px; font-weight: 600; color: white; box-shadow: 0 4px 12px rgba(90,158,114,0.35); }
        .logo-label { font-family: 'Lora', serif; font-size: 18px; font-weight: 500; color: rgba(232,237,233,0.8); }
        .sidebar-nav { display: flex; flex-direction: column; gap: 4px; flex: 1; }
        .nav-item { display: flex; align-items: center; gap: 12px; padding: 10px 12px; border-radius: 12px; border: none; background: transparent; color: rgba(232,237,233,0.45); font-family: 'Nunito', sans-serif; font-size: 14px; font-weight: 500; cursor: pointer; transition: all 0.2s; text-align: left; }
        .nav-item:hover { background: rgba(255,255,255,0.05); color: rgba(232,237,233,0.8); }
        .nav-item.active { background: rgba(90,158,114,0.12); color: #8fd3a8; }
        .nav-icon { flex-shrink: 0; }
        .sidebar-footer { display: flex; flex-direction: column; gap: 10px; border-top: 1px solid rgba(255,255,255,0.06); padding-top: 16px; }
        .user-pill { display: flex; align-items: center; gap: 10px; padding: 8px; }
        .user-pill-info { display: flex; flex-direction: column; min-width: 0; }
        .user-pill-name { font-size: 13px; font-weight: 600; color: #e8ede9; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .user-pill-email { font-size: 11px; color: rgba(232,237,233,0.35); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .signout-btn { display: flex; align-items: center; gap: 8px; padding: 8px 12px; border-radius: 10px; border: none; background: transparent; color: rgba(232,237,233,0.3); font-family: 'Nunito', sans-serif; font-size: 13px; cursor: pointer; transition: all 0.2s; }
        .signout-btn:hover { background: rgba(255,100,100,0.08); color: #ff8080; }

        /* MAIN */
        .main { flex: 1; overflow-y: auto; }
        .loading-state { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; gap: 16px; color: rgba(232,237,233,0.4); font-size: 14px; }
        .loading-spinner { width: 32px; height: 32px; border: 2px solid rgba(90,158,114,0.2); border-top-color: #5a9e72; border-radius: 50%; animation: spin 0.8s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
        .animate-in { animation: fadeUp 0.4s ease forwards; }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }

        /* EMPTY STATE */
        .empty-state { min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 48px 40px; position: relative; overflow: hidden; }
        .empty-bg-glow { position: absolute; width: 500px; height: 500px; background: radial-gradient(circle, rgba(90,158,114,0.08) 0%, transparent 70%); top: 50%; left: 50%; transform: translate(-50%, -50%); pointer-events: none; }
        .empty-content { position: relative; z-index: 1; max-width: 560px; width: 100%; display: flex; flex-direction: column; gap: 28px; }
        .greeting-badge { display: inline-flex; align-items: center; padding: 6px 14px; background: rgba(90,158,114,0.1); border: 1px solid rgba(90,158,114,0.2); border-radius: 999px; font-size: 13px; color: #8fd3a8; align-self: flex-start; }
        .empty-title { font-family: 'Lora', serif; font-size: 42px; font-weight: 600; color: #e8ede9; line-height: 1.15; margin: 0; }
        .empty-title em { font-style: italic; color: #8fd3a8; }
        .empty-subtitle { font-size: 15px; color: rgba(232,237,233,0.45); line-height: 1.7; margin: -12px 0 0; }
        .empty-actions { display: flex; flex-direction: column; gap: 12px; }
        .action-card { display: flex; align-items: center; gap: 16px; padding: 20px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.07); border-radius: 18px; cursor: pointer; text-align: left; transition: all 0.25s; }
        .action-card:hover { background: rgba(90,158,114,0.06); border-color: rgba(90,158,114,0.3); transform: translateX(4px); }
        .primary-action { border-color: rgba(90,158,114,0.2); background: rgba(90,158,114,0.05); }
        .action-icon-wrap { width: 48px; height: 48px; flex-shrink: 0; background: rgba(90,158,114,0.12); border-radius: 14px; display: flex; align-items: center; justify-content: center; color: #8fd3a8; }
        .secondary-icon { background: rgba(255,255,255,0.05); color: rgba(232,237,233,0.5); }
        .action-text { flex: 1; }
        .action-text h3 { font-size: 15px; font-weight: 600; color: #e8ede9; margin: 0 0 4px; }
        .action-text p { font-size: 13px; color: rgba(232,237,233,0.4); margin: 0; line-height: 1.5; }
        .action-chevron { color: rgba(232,237,233,0.2); flex-shrink: 0; transition: transform 0.2s; }
        .action-card:hover .action-chevron { transform: translateX(4px); color: #8fd3a8; }
        .empty-illustration { display: flex; flex-direction: column; align-items: center; gap: 0; padding: 24px; background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.05); border-radius: 20px; margin-top: 8px; }
        .tree-node { display: flex; flex-direction: column; align-items: center; }
        .tree-row { display: flex; gap: 32px; }
        .tree-avatar { width: 44px; height: 44px; background: rgba(255,255,255,0.05); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 22px; }
        .small-avatar { width: 36px; height: 36px; font-size: 18px; }
        .tree-line { width: 2px; height: 20px; background: rgba(90,158,114,0.2); }
        .tree-caption { font-size: 12px; color: rgba(232,237,233,0.25); margin: 16px 0 0; text-align: center; }

        /* HAS GROUP */
        .dashboard-content { padding: 36px 40px; }
        .topbar { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 32px; }
        .topbar-title { font-family: 'Lora', serif; font-size: 26px; font-weight: 600; color: #e8ede9; margin: 0 0 4px; }
        .topbar-sub { font-size: 13px; color: rgba(232,237,233,0.4); margin: 0; }
        .new-post-btn { display: flex; align-items: center; gap: 7px; padding: 10px 18px; background: linear-gradient(135deg, #5a9e72, #8fd3a8); color: #0e1117; border: none; border-radius: 12px; font-family: 'Nunito', sans-serif; font-size: 13px; font-weight: 600; cursor: pointer; transition: opacity 0.2s, transform 0.15s; box-shadow: 0 4px 16px rgba(90,158,114,0.3); }
        .new-post-btn:hover { opacity: 0.9; transform: translateY(-1px); }
        .dashboard-grid { display: grid; grid-template-columns: 340px 1fr; gap: 24px; align-items: start; }
        .left-col { display: flex; flex-direction: column; gap: 16px; }
        .right-col { display: flex; flex-direction: column; gap: 16px; }
        .group-card { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.07); border-radius: 20px; overflow: hidden; }
        .group-cover { width: 100%; height: 110px; object-fit: cover; }
        .group-cover-placeholder { width: 100%; height: 110px; background: linear-gradient(135deg, rgba(90,158,114,0.1), rgba(90,158,114,0.05)); display: flex; align-items: center; justify-content: center; color: rgba(143,211,168,0.3); }
        .group-card-body { padding: 18px; }
        .group-card-top { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; margin-bottom: 16px; }
        .group-name { font-family: 'Lora', serif; font-size: 18px; font-weight: 600; color: #e8ede9; margin: 0 0 4px; }
        .group-desc { font-size: 12px; color: rgba(232,237,233,0.4); margin: 0; }
        .invite-chip { display: flex; flex-direction: column; align-items: flex-end; gap: 4px; flex-shrink: 0; }
        .invite-chip-label { font-size: 10px; color: rgba(232,237,233,0.3); text-transform: uppercase; letter-spacing: 0.08em; }
        .invite-chip-code { font-size: 13px; font-weight: 600; letter-spacing: 0.15em; color: #8fd3a8; }
        .invite-copy { background: rgba(90,158,114,0.1); border: 1px solid rgba(90,158,114,0.2); border-radius: 6px; padding: 3px 7px; color: #8fd3a8; cursor: pointer; font-size: 11px; transition: background 0.2s; }
        .invite-copy:hover { background: rgba(90,158,114,0.2); }
        .members-preview { display: flex; align-items: center; gap: 12px; }
        .members-avatars { display: flex; }
        .member-avatar-wrap { margin-right: -10px; border: 2px solid #0e1117; border-radius: 50%; }
        .member-more { width: 36px; height: 36px; background: rgba(255,255,255,0.08); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 600; color: rgba(232,237,233,0.5); margin-left: 2px; border: 2px solid #0e1117; }
        .members-count { font-size: 12px; color: rgba(232,237,233,0.35); margin-left: 14px; }
        .quick-actions { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
        .quick-btn { display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 16px 12px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06); border-radius: 16px; cursor: pointer; transition: all 0.2s; }
        .quick-btn:hover { background: rgba(90,158,114,0.07); border-color: rgba(90,158,114,0.2); transform: translateY(-2px); }
        .quick-emoji { font-size: 24px; }
        .quick-label { font-size: 12px; font-weight: 500; color: rgba(232,237,233,0.55); }
        .feed-header { display: flex; align-items: center; justify-content: space-between; padding: 20px 20px 16px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.07); border-radius: 20px 20px 0 0; border-bottom: none; }
        .feed-title { font-family: 'Lora', serif; font-size: 17px; font-weight: 600; color: #e8ede9; margin: 0; }
        .post-btn { display: flex; align-items: center; gap: 6px; padding: 7px 14px; background: rgba(90,158,114,0.1); border: 1px solid rgba(90,158,114,0.2); border-radius: 10px; color: #8fd3a8; font-family: 'Nunito', sans-serif; font-size: 13px; cursor: pointer; transition: background 0.2s; }
        .post-btn:hover { background: rgba(90,158,114,0.18); }
        .feed-empty { display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 48px 24px; background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06); border-radius: 0 0 20px 20px; text-align: center; }
        .feed-empty-icon { font-size: 36px; margin-bottom: 8px; }
        .feed-empty-title { font-size: 15px; font-weight: 600; color: rgba(232,237,233,0.6); margin: 0; }
        .feed-empty-sub { font-size: 13px; color: rgba(232,237,233,0.3); margin: 0; }
        .feed-post-cta { margin-top: 8px; padding: 9px 20px; background: rgba(90,158,114,0.1); border: 1px solid rgba(90,158,114,0.2); border-radius: 10px; color: #8fd3a8; cursor: pointer; font-family: 'Nunito', sans-serif; font-size: 13px; transition: background 0.2s; }
        .feed-post-cta:hover { background: rgba(90,158,114,0.18); }
      `}</style>
    </div>
  );
}