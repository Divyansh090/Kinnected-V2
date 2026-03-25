"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";

// ── Types ─────────────────────────────────────────────────────────────────────

interface RealMember { id: string; name: string; profilePhoto: string | null; }
interface Suggestions { real: RealMember[]; ghost: string[]; }

interface FormState {
  fatherName: string; motherName: string; spouseName: string;
  childrenNames: string[]; siblingNames: string[];
  grandfatherPaternalName: string; grandmotherPaternalName: string;
  grandfatherMaternalName: string; grandmotherMaternalName: string;
}

const EMPTY: FormState = {
  fatherName: "", motherName: "", spouseName: "",
  childrenNames: [""], siblingNames: [""],
  grandfatherPaternalName: "", grandmotherPaternalName: "",
  grandfatherMaternalName: "", grandmotherMaternalName: "",
};

const SECTIONS = [
  { key: "parents",      label: "Parents",         emoji: "👨‍👩‍👦", desc: "Your father and mother" },
  { key: "grandparents", label: "Grandparents",     emoji: "👴👵", desc: "Paternal and maternal grandparents" },
  { key: "spouse",       label: "Spouse / Partner", emoji: "💍",   desc: "Your husband, wife, or partner" },
  { key: "children",     label: "Children",         emoji: "👶",   desc: "Your sons and daughters" },
  { key: "siblings",     label: "Siblings",         emoji: "🧑‍🤝‍🧑", desc: "Brothers and sisters" },
];

// ── Mini Avatar ───────────────────────────────────────────────────────────────

function MiniAvatar({ src, name }: { src?: string | null; name: string }) {
  const initials = name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
  if (src) return <img src={src} alt={name} style={{ width: 26, height: 26, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />;
  return (
    <div style={{ width: 26, height: 26, borderRadius: "50%", flexShrink: 0, background: "linear-gradient(135deg, #4a7a5e, #7ab89a)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 700, color: "white" }}>
      {initials}
    </div>
  );
}

// ── AutoInput ─────────────────────────────────────────────────────────────────

function AutoInput({ label, placeholder, value, onChange, suggestions }: {
  label: string; placeholder: string; value: string;
  onChange: (v: string) => void; suggestions: Suggestions;
}) {
  const [open, setOpen]       = useState(false);
  const [focused, setFocused] = useState(false);
  const containerRef          = useRef<HTMLDivElement>(null);

  const q             = value.trim().toLowerCase();
  const filteredReal  = suggestions.real.filter((m) => !q || m.name.toLowerCase().includes(q));
  const filteredGhost = suggestions.ghost.filter((n) => !q || n.toLowerCase().includes(q));
  const hasResults    = filteredReal.length > 0 || filteredGhost.length > 0;
  const showDropdown  = open && focused && hasResults;

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false); setFocused(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const select = (name: string) => { onChange(name); setOpen(false); setFocused(false); };

  return (
    <div ref={containerRef} style={{ display: "flex", flexDirection: "column", gap: 6, position: "relative", flex: 1 }}>
      {label && <label style={{ fontSize: 11, fontWeight: 500, color: "rgba(238,234,228,0.4)", textTransform: "uppercase", letterSpacing: "0.08em" }}>{label}</label>}

      <div style={{ position: "relative" }}>
        <input
          type="text"
          value={value}
          placeholder={placeholder}
          autoComplete="off"
          onChange={(e) => { onChange(e.target.value); setOpen(true); }}
          onFocus={() => { setFocused(true); setOpen(true); }}
          style={{
            width: "100%", padding: value ? "11px 34px 11px 14px" : "11px 14px",
            background: focused ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.04)",
            border: `1px solid ${focused ? "rgba(201,120,58,0.5)" : "rgba(255,255,255,0.08)"}`,
            borderRadius: 12, color: "#eeeae4",
            fontFamily: "'Manrope', sans-serif", fontSize: 14, outline: "none",
            transition: "all 0.2s", boxSizing: "border-box" as const,
          }}
        />
        {value && (
          <button
            onMouseDown={(e) => { e.preventDefault(); onChange(""); }}
            style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "rgba(238,234,228,0.3)", fontSize: 18, cursor: "pointer", lineHeight: 1, padding: "2px 4px" }}
          >×</button>
        )}
      </div>

      {showDropdown && (
        <div style={{
          position: "absolute", top: "calc(100% + 6px)", left: 0, right: 0, zIndex: 200,
          background: "#1a1d26", border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: 14, padding: 6,
          boxShadow: "0 16px 48px rgba(0,0,0,0.6)",
          maxHeight: 220, overflowY: "auto" as const,
        }}>
          {/* Real members */}
          {filteredReal.length > 0 && (
            <>
              <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 10, fontWeight: 700, color: "rgba(238,234,228,0.3)", textTransform: "uppercase" as const, letterSpacing: "0.08em", padding: "6px 10px 4px" }}>
                <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#5a9e72", flexShrink: 0 }} />
                Members in your group
              </div>
              {filteredReal.map((m) => (
                <button key={m.id} onMouseDown={(e) => { e.preventDefault(); select(m.name); }}
                  style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "8px 10px", background: "transparent", border: "none", borderRadius: 9, cursor: "pointer", textAlign: "left" as const }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(201,120,58,0.1)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                >
                  <MiniAvatar src={m.profilePhoto} name={m.name} />
                  <span style={{ fontSize: 13, fontWeight: 500, color: "#eeeae4", flex: 1 }}>{m.name}</span>
                  <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 999, background: "rgba(90,158,114,0.15)", border: "1px solid rgba(90,158,114,0.3)", color: "#8fd3a8", flexShrink: 0 }}>Joined ✓</span>
                </button>
              ))}
            </>
          )}

          {filteredReal.length > 0 && filteredGhost.length > 0 && (
            <div style={{ height: 1, background: "rgba(255,255,255,0.06)", margin: "4px 6px" }} />
          )}

          {/* Ghost names */}
          {filteredGhost.length > 0 && (
            <>
              <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 10, fontWeight: 700, color: "rgba(238,234,228,0.3)", textTransform: "uppercase" as const, letterSpacing: "0.08em", padding: "6px 10px 4px" }}>
                <div style={{ width: 6, height: 6, borderRadius: "50%", background: "rgba(255,255,255,0.25)", flexShrink: 0 }} />
                Mentioned in other profiles
              </div>
              {filteredGhost.map((name) => (
                <button key={name} onMouseDown={(e) => { e.preventDefault(); select(name); }}
                  style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "8px 10px", background: "transparent", border: "none", borderRadius: 9, cursor: "pointer", textAlign: "left" as const }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(201,120,58,0.1)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                >
                  <div style={{ width: 26, height: 26, borderRadius: "50%", background: "rgba(255,255,255,0.06)", border: "1.5px dashed rgba(255,255,255,0.15)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, color: "rgba(238,234,228,0.3)", flexShrink: 0 }}>?</div>
                  <span style={{ fontSize: 13, fontWeight: 500, color: "#eeeae4", flex: 1 }}>{name}</span>
                  <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 999, background: "rgba(255,255,255,0.05)", border: "1px dashed rgba(255,255,255,0.15)", color: "rgba(238,234,228,0.3)", flexShrink: 0 }}>Not joined</span>
                </button>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ── Array AutoInput ───────────────────────────────────────────────────────────

function ArrayAutoInput({ label, placeholder, values, onChange, suggestions, addLabel }: {
  label: string; placeholder: string; values: string[];
  onChange: (v: string[]) => void; suggestions: Suggestions; addLabel: string;
}) {
  const setItem    = (i: number, v: string) => { const a = [...values]; a[i] = v; onChange(a); };
  const addItem    = () => onChange([...values, ""]);
  const removeItem = (i: number) => { const a = values.filter((_, idx) => idx !== i); onChange(a.length ? a : [""]); };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {values.map((v, i) => (
        <div key={i} style={{ display: "flex", alignItems: "flex-end", gap: 10 }}>
          <AutoInput label={i === 0 ? label : ""} placeholder={placeholder} value={v}
            onChange={(val) => setItem(i, val)} suggestions={suggestions} />
          {values.length > 1 && (
            <button onClick={() => removeItem(i)}
              style={{ width: 34, height: 40, flexShrink: 0, background: "rgba(255,100,100,0.08)", border: "1px solid rgba(255,100,100,0.15)", borderRadius: 10, color: "rgba(255,120,120,0.6)", fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
            >✕</button>
          )}
        </div>
      ))}
      <button onClick={addItem}
        style={{ alignSelf: "flex-start", padding: "8px 16px", background: "rgba(255,255,255,0.04)", border: "1px dashed rgba(255,255,255,0.12)", borderRadius: 10, color: "rgba(238,234,228,0.4)", fontFamily: "'Manrope', sans-serif", fontSize: 12, fontWeight: 600, cursor: "pointer" }}
      >+ {addLabel}</button>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function FamilyProfilePage() {
  const router        = useRouter();
  const searchParams  = useSearchParams();
  const groupId       = searchParams.get("groupId");

  const [form,          setForm]          = useState<FormState>(EMPTY);
  const [suggestions,   setSuggestions]   = useState<Suggestions>({ real: [], ghost: [] });
  const [activeSection, setActiveSection] = useState("parents");
  const [saving,        setSaving]        = useState(false);
  const [saved,         setSaved]         = useState(false);
  const [error,         setError]         = useState("");
  const [matchedCount,  setMatchedCount]  = useState<number | null>(null);

  useEffect(() => {
    if (!groupId) return;
    fetch(`/api/group/suggestions?groupId=${groupId}`)
      .then((r) => r.json()).then((d) => setSuggestions({ real: d.real ?? [], ghost: d.ghost ?? [] })).catch(() => {});
    fetch(`/api/family-profile?groupId=${groupId}`)
      .then((r) => r.json()).then(({ profile }) => {
        if (profile) setForm({
          fatherName:              profile.fatherName              ?? "",
          motherName:              profile.motherName              ?? "",
          spouseName:              profile.spouseName              ?? "",
          childrenNames:           profile.childrenNames?.length   ? profile.childrenNames : [""],
          siblingNames:            profile.siblingNames?.length    ? profile.siblingNames  : [""],
          grandfatherPaternalName: profile.grandfatherPaternalName ?? "",
          grandmotherPaternalName: profile.grandmotherPaternalName ?? "",
          grandfatherMaternalName: profile.grandfatherMaternalName ?? "",
          grandmotherMaternalName: profile.grandmotherMaternalName ?? "",
        });
      });
  }, [groupId]);

  const set = (key: keyof FormState) => (value: string) => setForm((p) => ({ ...p, [key]: value }));

  const handleSave = async () => {
    setSaving(true); setError("");
    try {
      const res = await fetch("/api/family-profile", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ groupId, ...form, childrenNames: form.childrenNames.filter((n) => n.trim()), siblingNames: form.siblingNames.filter((n) => n.trim()) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setMatchedCount(data.matchedCount);
      setSaved(true);
      setTimeout(() => router.push(`/family-tree?groupId=${groupId}`), 1600);
    } catch (err: any) { setError(err.message); }
    finally { setSaving(false); }
  };

  const filledCount = [
    form.fatherName, form.motherName, form.spouseName,
    form.grandfatherPaternalName, form.grandmotherPaternalName,
    form.grandfatherMaternalName, form.grandmotherMaternalName,
    ...form.childrenNames, ...form.siblingNames,
  ].filter((v) => v.trim()).length;

  const twoCol = { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 } as const;
  const oneCol = { display: "grid", gridTemplateColumns: "1fr", gap: 16 } as const;

  return (
    <div className="root">
      <div className="bg-wash" />
      <div className="layout">

        {/* Sidebar */}
        <aside className="sidebar">
          <div className="sidebar-top">
            <button className="back-link" onClick={() => router.push("/dashboard")}>← Dashboard</button>
            <h2 className="sidebar-title">Your Family</h2>
            <p className="sidebar-sub">Start typing any name to see suggestions from your group.</p>
          </div>
          <nav className="section-nav">
            {SECTIONS.map((s) => (
              <button key={s.key} className={`section-btn ${activeSection === s.key ? "active" : ""}`} onClick={() => setActiveSection(s.key)}>
                <span className="section-emoji">{s.emoji}</span>
                <div>
                  <p className="section-btn-label">{s.label}</p>
                  <p className="section-btn-desc">{s.desc}</p>
                </div>
              </button>
            ))}
          </nav>
          <div className="sidebar-footer">
            <div className="filled-badge">
              <span className="filled-num">{filledCount}</span>
              <span className="filled-label">names filled</span>
            </div>
            {suggestions.real.length > 0 && (
              <p className="members-hint">💡 {suggestions.real.length} group member{suggestions.real.length !== 1 ? "s" : ""} available as suggestions</p>
            )}
          </div>
        </aside>

        {/* Form */}
        <main className="form-area">
          <div className="form-card">

            {activeSection === "parents" && (
              <div className="section animate-in">
                <SH emoji="👨‍👩‍👦" title="Parents" hint="Start typing to see group member suggestions." />
                <div style={twoCol}>
                  <AutoInput label="Father's Name" placeholder="e.g. Rajesh Sharma" value={form.fatherName} onChange={set("fatherName")} suggestions={suggestions} />
                  <AutoInput label="Mother's Name" placeholder="e.g. Sunita Sharma" value={form.motherName} onChange={set("motherName")} suggestions={suggestions} />
                </div>
                <div className="btn-row"><NB onClick={() => setActiveSection("grandparents")} /></div>
              </div>
            )}

            {activeSection === "grandparents" && (
              <div className="section animate-in">
                <SH emoji="👴👵" title="Grandparents" hint="Paternal and maternal sides." />
                <p className="sub-label">Paternal (Father's side)</p>
                <div style={twoCol}>
                  <AutoInput label="Paternal Grandfather" placeholder="e.g. Mohan Sharma" value={form.grandfatherPaternalName} onChange={set("grandfatherPaternalName")} suggestions={suggestions} />
                  <AutoInput label="Paternal Grandmother" placeholder="e.g. Kamla Sharma" value={form.grandmotherPaternalName} onChange={set("grandmotherPaternalName")} suggestions={suggestions} />
                </div>
                <p className="sub-label">Maternal (Mother's side)</p>
                <div style={twoCol}>
                  <AutoInput label="Maternal Grandfather" placeholder="e.g. Suresh Gupta" value={form.grandfatherMaternalName} onChange={set("grandfatherMaternalName")} suggestions={suggestions} />
                  <AutoInput label="Maternal Grandmother" placeholder="e.g. Radha Gupta" value={form.grandmotherMaternalName} onChange={set("grandmotherMaternalName")} suggestions={suggestions} />
                </div>
                <div className="btn-row"><BB onClick={() => setActiveSection("parents")} /><NB onClick={() => setActiveSection("spouse")} /></div>
              </div>
            )}

            {activeSection === "spouse" && (
              <div className="section animate-in">
                <SH emoji="💍" title="Spouse / Partner" hint="Leave blank if not applicable." />
                <div style={oneCol}>
                  <AutoInput label="Spouse / Partner Name" placeholder="e.g. Priya Sharma" value={form.spouseName} onChange={set("spouseName")} suggestions={suggestions} />
                </div>
                <div className="btn-row"><BB onClick={() => setActiveSection("grandparents")} /><NB onClick={() => setActiveSection("children")} /></div>
              </div>
            )}

            {activeSection === "children" && (
              <div className="section animate-in">
                <SH emoji="👶" title="Children" hint="Add as many as needed." />
                <ArrayAutoInput label="Child" placeholder="e.g. Arjun Sharma" values={form.childrenNames} onChange={(v) => setForm((p) => ({ ...p, childrenNames: v }))} suggestions={suggestions} addLabel="Add another child" />
                <div className="btn-row"><BB onClick={() => setActiveSection("spouse")} /><NB onClick={() => setActiveSection("siblings")} /></div>
              </div>
            )}

            {activeSection === "siblings" && (
              <div className="section animate-in">
                <SH emoji="🧑‍🤝‍🧑" title="Siblings" hint="Brothers and sisters." />
                <ArrayAutoInput label="Sibling" placeholder="e.g. Rohit Sharma" values={form.siblingNames} onChange={(v) => setForm((p) => ({ ...p, siblingNames: v }))} suggestions={suggestions} addLabel="Add another sibling" />
                {error && <p style={{ color: "#ff7b7b", fontSize: 13, textAlign: "center" }}>{error}</p>}
                {saved ? (
                  <div className="success-banner">✓ Saved! {matchedCount !== null && `Matched ${matchedCount} members.`} Building your tree…</div>
                ) : (
                  <div className="btn-row">
                    <BB onClick={() => setActiveSection("children")} />
                    <button className="btn-save" onClick={handleSave} disabled={saving}>
                      {saving ? <span className="spinner" /> : <>Save & Build Tree 🌳</>}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="progress-dots">
            {SECTIONS.map((s) => (
              <button key={s.key} className={`dot ${activeSection === s.key ? "active" : ""}`} onClick={() => setActiveSection(s.key)} />
            ))}
          </div>
        </main>
      </div>

      <style jsx>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@500;700&family=Manrope:wght@300;400;500;600;700&display=swap');
        * { box-sizing: border-box; }
        .root { min-height: 100vh; background: #0f1117; font-family: 'Manrope', sans-serif; color: #eeeae4; position: relative; }
        .bg-wash { position: fixed; inset: 0; pointer-events: none; background: radial-gradient(ellipse 70% 60% at 0% 50%, rgba(180,120,60,0.06) 0%, transparent 55%), radial-gradient(ellipse 50% 70% at 100% 50%, rgba(60,100,80,0.05) 0%, transparent 55%); }
        .layout { display: flex; min-height: 100vh; position: relative; z-index: 1; }
        .sidebar { width: 280px; flex-shrink: 0; background: rgba(255,255,255,0.02); border-right: 1px solid rgba(255,255,255,0.06); display: flex; flex-direction: column; padding: 32px 20px; position: sticky; top: 0; height: 100vh; overflow-y: auto; }
        .sidebar-top { margin-bottom: 28px; }
        .back-link { background: none; border: none; color: rgba(238,234,228,0.35); font-family: 'Manrope', sans-serif; font-size: 12px; cursor: pointer; padding: 0; margin-bottom: 16px; display: block; transition: color 0.2s; }
        .back-link:hover { color: rgba(238,234,228,0.7); }
        .sidebar-title { font-family: 'Playfair Display', serif; font-size: 22px; font-weight: 700; color: #eeeae4; margin: 0 0 8px; }
        .sidebar-sub { font-size: 12px; color: rgba(238,234,228,0.38); line-height: 1.6; margin: 0; }
        .section-nav { display: flex; flex-direction: column; gap: 4px; flex: 1; }
        .section-btn { display: flex; align-items: center; gap: 12px; padding: 12px 14px; border-radius: 14px; border: none; background: transparent; cursor: pointer; text-align: left; transition: all 0.2s; }
        .section-btn:hover { background: rgba(255,255,255,0.04); }
        .section-btn.active { background: rgba(201,120,58,0.1); border: 1px solid rgba(201,120,58,0.2); }
        .section-emoji { font-size: 22px; flex-shrink: 0; }
        .section-btn-label { font-size: 13px; font-weight: 600; color: rgba(238,234,228,0.8); margin: 0 0 2px; }
        .section-btn.active .section-btn-label { color: #d4956a; }
        .section-btn-desc { font-size: 11px; color: rgba(238,234,228,0.3); margin: 0; }
        .sidebar-footer { padding-top: 20px; border-top: 1px solid rgba(255,255,255,0.06); display: flex; flex-direction: column; gap: 10px; }
        .filled-badge { display: flex; align-items: baseline; gap: 6px; padding: 10px 14px; background: rgba(90,158,114,0.08); border-radius: 12px; border: 1px solid rgba(90,158,114,0.15); }
        .filled-num { font-size: 22px; font-weight: 700; color: #8fd3a8; }
        .filled-label { font-size: 12px; color: rgba(143,211,168,0.5); }
        .members-hint { font-size: 11px; color: rgba(238,234,228,0.3); margin: 0; line-height: 1.5; }
        .form-area { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 40px 32px; gap: 20px; }
        .form-card { width: 100%; max-width: 580px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.07); border-radius: 24px; padding: 36px; }
        .section { display: flex; flex-direction: column; gap: 22px; }
        .animate-in { animation: fadeUp 0.3s ease forwards; }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .sub-label { font-size: 11px; font-weight: 700; color: rgba(238,234,228,0.3); text-transform: uppercase; letter-spacing: 0.1em; margin: 0; }
        .btn-row { display: flex; justify-content: flex-end; gap: 10px; }
        .btn-save { display: flex; align-items: center; gap: 8px; padding: 13px 24px; background: linear-gradient(135deg, #c9783a, #e8a87c); color: white; border: none; border-radius: 14px; font-family: 'Manrope', sans-serif; font-size: 14px; font-weight: 700; cursor: pointer; transition: opacity 0.2s; box-shadow: 0 8px 24px rgba(201,120,58,0.3); }
        .btn-save:hover { opacity: 0.9; }
        .btn-save:disabled { opacity: 0.4; cursor: not-allowed; }
        .spinner { width: 16px; height: 16px; border: 2px solid rgba(255,255,255,0.3); border-top-color: white; border-radius: 50%; animation: spin 0.7s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
        .success-banner { display: flex; align-items: center; gap: 10px; padding: 14px 18px; background: rgba(90,158,114,0.1); border: 1px solid rgba(90,158,114,0.25); border-radius: 14px; color: #8fd3a8; font-size: 14px; font-weight: 600; }
        .progress-dots { display: flex; gap: 8px; }
        .dot { width: 8px; height: 8px; border-radius: 50%; background: rgba(255,255,255,0.12); border: none; cursor: pointer; transition: all 0.2s; padding: 0; }
        .dot.active { background: #c9783a; width: 24px; border-radius: 4px; box-shadow: 0 0 8px rgba(201,120,58,0.5); }
      `}</style>
    </div>
  );
}

function SH({ emoji, title, hint }: { emoji: string; title: string; hint: string }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
      <span style={{ fontSize: 36, lineHeight: 1 }}>{emoji}</span>
      <div>
        <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: 22, fontWeight: 700, color: "#eeeae4", margin: "0 0 4px" }}>{title}</h3>
        <p style={{ fontSize: 12, color: "rgba(238,234,228,0.4)", margin: 0, lineHeight: 1.5 }}>{hint}</p>
      </div>
    </div>
  );
}

function NB({ onClick }: { onClick: () => void }) {
  return <button onClick={onClick} style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 22px", background: "rgba(201,120,58,0.12)", border: "1px solid rgba(201,120,58,0.3)", borderRadius: 13, color: "#d4956a", fontFamily: "'Manrope', sans-serif", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Next →</button>;
}

function BB({ onClick }: { onClick: () => void }) {
  return <button onClick={onClick} style={{ padding: "12px 18px", background: "transparent", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 13, color: "rgba(238,234,228,0.4)", fontFamily: "'Manrope', sans-serif", fontSize: 13, cursor: "pointer" }}>← Back</button>;
}