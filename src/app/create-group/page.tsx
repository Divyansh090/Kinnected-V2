"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";

type Mode = "choose" | "create" | "join" | "success";

interface CreatedGroup {
  id: string;
  name: string;
  inviteCode: string;
}

export default function CreateGroupPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [mode, setMode] = useState<Mode>("choose");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [createdGroup, setCreatedGroup] = useState<CreatedGroup | null>(null);
  const [copied, setCopied] = useState(false);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);

  const [createForm, setCreateForm] = useState({
    name: "",
    description: "",
    coverPhoto: "",
  });

  const [joinCode, setJoinCode] = useState("");

  const handleCoverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      setCoverPreview(result);
      setCreateForm((p) => ({ ...p, coverPhoto: result }));
    };
    reader.readAsDataURL(file);
  };

  const handleCreate = async () => {
    if (!createForm.name.trim()) {
      setError("Please enter a family name.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/group/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(createForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Something went wrong");
      setCreatedGroup(data.group);
      setMode("success");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async () => {
    if (!joinCode.trim()) {
      setError("Please enter an invite code.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/group/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inviteCode: joinCode }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Something went wrong");
      router.push(`/dashboard`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const copyInviteCode = () => {
    if (!createdGroup) return;
    navigator.clipboard.writeText(createdGroup.inviteCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="root">
      {/* Decorative background */}
      <div className="bg-pattern" />
      <div className="bg-glow" />

      <div className="card">
        {/* Logo */}
        <div className="logo">
          <span className="logo-k">K</span>
          <span className="logo-text">innected</span>
        </div>

        {/* CHOOSE MODE */}
        {mode === "choose" && (
          <div className="section animate-in">
            <h1 className="title">Your family, your space</h1>
            <p className="subtitle">Create a new family group or join one with an invite code.</p>

            <div className="choice-grid">
              <button className="choice-card" onClick={() => setMode("create")}>
                <div className="choice-icon">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                    <circle cx="9" cy="7" r="4"/>
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>
                  </svg>
                </div>
                <h3 className="choice-title">Create a Group</h3>
                <p className="choice-desc">Start a new family group and invite your members.</p>
                <div className="choice-arrow">→</div>
              </button>

              <button className="choice-card" onClick={() => setMode("join")}>
                <div className="choice-icon">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/>
                    <polyline points="10 17 15 12 10 7"/>
                    <line x1="15" y1="12" x2="3" y2="12"/>
                  </svg>
                </div>
                <h3 className="choice-title">Join a Group</h3>
                <p className="choice-desc">Enter an invite code to join your family's group.</p>
                <div className="choice-arrow">→</div>
              </button>
            </div>
          </div>
        )}

        {/* CREATE MODE */}
        {mode === "create" && (
          <div className="section animate-in">
            <button className="back-btn" onClick={() => { setMode("choose"); setError(""); }}>
              ← Back
            </button>
            <h1 className="title">Create your family group</h1>
            <p className="subtitle">Give your family a home on Kinnected.</p>

            {/* Cover photo */}
            <div
              className="cover-upload"
              onClick={() => fileInputRef.current?.click()}
              style={{ backgroundImage: coverPreview ? `url(${coverPreview})` : "none" }}
            >
              {!coverPreview && (
                <div className="cover-placeholder">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <rect x="3" y="3" width="18" height="18" rx="2"/>
                    <circle cx="8.5" cy="8.5" r="1.5"/>
                    <polyline points="21 15 16 10 5 21"/>
                  </svg>
                  <span>Add cover photo</span>
                </div>
              )}
              <div className="cover-overlay">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                  <circle cx="12" cy="13" r="4"/>
                </svg>
              </div>
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden-input" onChange={handleCoverChange} />
            </div>

            <div className="field-group">
              <label className="field-label">Family Name <span className="required">*</span></label>
              <input
                type="text"
                className="field-input"
                placeholder="e.g. The Sharma Family"
                value={createForm.name}
                onChange={(e) => setCreateForm((p) => ({ ...p, name: e.target.value }))}
              />
            </div>

            <div className="field-group">
              <label className="field-label">Description <span className="optional">(optional)</span></label>
              <textarea
                className="field-textarea"
                placeholder="A short description of your family group..."
                value={createForm.description}
                onChange={(e) => setCreateForm((p) => ({ ...p, description: e.target.value }))}
                rows={3}
              />
            </div>

            {error && <p className="error-msg">{error}</p>}

            <button className="btn-primary" onClick={handleCreate} disabled={loading}>
              {loading ? (
                <span className="spinner" />
              ) : (
                <>
                  Create Family Group
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M5 12h14M12 5l7 7-7 7"/>
                  </svg>
                </>
              )}
            </button>
          </div>
        )}

        {/* JOIN MODE */}
        {mode === "join" && (
          <div className="section animate-in">
            <button className="back-btn" onClick={() => { setMode("choose"); setError(""); }}>
              ← Back
            </button>
            <h1 className="title">Join your family</h1>
            <p className="subtitle">Enter the invite code shared by your family member.</p>

            <div className="field-group">
              <label className="field-label">Invite Code</label>
              <input
                type="text"
                className="field-input code-input"
                placeholder="e.g. AB12CD34"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                maxLength={8}
              />
            </div>

            {error && <p className="error-msg">{error}</p>}

            <button className="btn-primary" onClick={handleJoin} disabled={loading}>
              {loading ? <span className="spinner" /> : (
                <>
                  Join Group
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/>
                    <polyline points="10 17 15 12 10 7"/>
                    <line x1="15" y1="12" x2="3" y2="12"/>
                  </svg>
                </>
              )}
            </button>
          </div>
        )}

        {/* SUCCESS MODE */}
        {mode === "success" && createdGroup && (
          <div className="section animate-in">
            <div className="success-icon">
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                <polyline points="22 4 12 14.01 9 11.01"/>
              </svg>
            </div>
            <h1 className="title">"{createdGroup.name}" is live! 🎉</h1>
            <p className="subtitle">Your family group has been created. Share the invite code below with your family members.</p>

            <div className="invite-box">
              <p className="invite-label">Invite Code</p>
              <div className="invite-code-row">
                <span className="invite-code">{createdGroup.inviteCode}</span>
                <button className="copy-btn" onClick={copyInviteCode}>
                  {copied ? (
                    <>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M20 6L9 17l-5-5"/>
                      </svg>
                      Copied!
                    </>
                  ) : (
                    <>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="9" y="9" width="13" height="13" rx="2"/>
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                      </svg>
                      Copy
                    </>
                  )}
                </button>
              </div>
              <p className="invite-hint">Anyone with this code can join your family group.</p>
            </div>

            <button className="btn-primary" onClick={() => router.push("/dashboard")}>
              Go to Dashboard
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M5 12h14M12 5l7 7-7 7"/>
              </svg>
            </button>
          </div>
        )}
      </div>

      <style jsx>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@500;600;700&family=Outfit:wght@300;400;500&display=swap');

        .root {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #0a0c10;
          padding: 24px;
          font-family: 'Outfit', sans-serif;
          position: relative;
          overflow: hidden;
        }

        .bg-pattern {
          position: fixed; inset: 0;
          background-image: radial-gradient(circle at 1px 1px, rgba(255,255,255,0.04) 1px, transparent 0);
          background-size: 32px 32px;
          pointer-events: none;
        }

        .bg-glow {
          position: fixed;
          width: 600px; height: 600px;
          background: radial-gradient(circle, rgba(100,160,120,0.12) 0%, transparent 70%);
          top: 50%; left: 50%;
          transform: translate(-50%, -50%);
          pointer-events: none;
        }

        .card {
          position: relative; z-index: 1;
          width: 100%; max-width: 500px;
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 28px;
          padding: 40px;
          backdrop-filter: blur(24px);
          box-shadow: 0 40px 100px rgba(0,0,0,0.6);
        }

        /* Logo */
        .logo {
          display: flex; align-items: center; gap: 4px;
          margin-bottom: 32px;
        }
        .logo-k {
          width: 40px; height: 40px;
          background: linear-gradient(135deg, #5a9e72, #8fd3a8);
          border-radius: 12px;
          display: flex; align-items: center; justify-content: center;
          font-family: 'Cormorant Garamond', serif;
          font-size: 22px; font-weight: 700; color: white;
          box-shadow: 0 6px 20px rgba(90,158,114,0.4);
        }
        .logo-text {
          font-family: 'Cormorant Garamond', serif;
          font-size: 22px; font-weight: 600;
          color: rgba(255,255,255,0.85);
          letter-spacing: 0.02em;
        }

        /* Section */
        .section { display: flex; flex-direction: column; gap: 20px; }
        .animate-in { animation: fadeUp 0.35s ease forwards; }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(14px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .title {
          font-family: 'Cormorant Garamond', serif;
          font-size: 28px; font-weight: 600;
          color: #f0f4f1;
          margin: 0; line-height: 1.2;
        }
        .subtitle {
          font-size: 14px; color: rgba(240,244,241,0.45);
          margin: -8px 0 0; line-height: 1.6;
        }

        /* Choice cards */
        .choice-grid { display: flex; flex-direction: column; gap: 14px; }
        .choice-card {
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 18px;
          padding: 22px;
          text-align: left; cursor: pointer;
          transition: all 0.25s ease;
          position: relative; overflow: hidden;
        }
        .choice-card:hover {
          border-color: rgba(90,158,114,0.4);
          background: rgba(90,158,114,0.06);
          transform: translateY(-2px);
          box-shadow: 0 12px 32px rgba(0,0,0,0.3);
        }
        .choice-icon {
          width: 52px; height: 52px;
          background: rgba(90,158,114,0.12);
          border-radius: 14px;
          display: flex; align-items: center; justify-content: center;
          color: #8fd3a8;
          margin-bottom: 14px;
        }
        .choice-title {
          font-family: 'Cormorant Garamond', serif;
          font-size: 20px; font-weight: 600;
          color: #f0f4f1; margin: 0 0 6px;
        }
        .choice-desc {
          font-size: 13px; color: rgba(240,244,241,0.45);
          margin: 0;
        }
        .choice-arrow {
          position: absolute; top: 22px; right: 22px;
          font-size: 20px; color: rgba(143,211,168,0.4);
          transition: transform 0.2s, color 0.2s;
        }
        .choice-card:hover .choice-arrow {
          transform: translateX(4px);
          color: #8fd3a8;
        }

        /* Back button */
        .back-btn {
          background: none; border: none;
          color: rgba(240,244,241,0.4);
          font-family: 'Outfit', sans-serif;
          font-size: 13px; cursor: pointer;
          padding: 0; align-self: flex-start;
          transition: color 0.2s;
        }
        .back-btn:hover { color: rgba(240,244,241,0.8); }

        /* Cover upload */
        .cover-upload {
          height: 140px;
          border-radius: 16px;
          border: 1.5px dashed rgba(90,158,114,0.3);
          cursor: pointer;
          position: relative; overflow: hidden;
          background-size: cover; background-position: center;
          transition: border-color 0.2s;
        }
        .cover-upload:hover { border-color: rgba(90,158,114,0.6); }
        .cover-placeholder {
          width: 100%; height: 100%;
          display: flex; flex-direction: column;
          align-items: center; justify-content: center;
          gap: 8px; color: rgba(240,244,241,0.3);
          font-size: 13px;
        }
        .cover-overlay {
          position: absolute; inset: 0;
          background: rgba(0,0,0,0.45);
          display: flex; align-items: center; justify-content: center;
          opacity: 0; transition: opacity 0.2s;
        }
        .cover-upload:hover .cover-overlay { opacity: 1; }
        .hidden-input { display: none; }

        /* Fields */
        .field-group { display: flex; flex-direction: column; gap: 7px; }
        .field-label {
          font-size: 11px; font-weight: 500;
          color: rgba(240,244,241,0.4);
          text-transform: uppercase; letter-spacing: 0.1em;
        }
        .required { color: #8fd3a8; }
        .optional { color: rgba(240,244,241,0.25); text-transform: none; font-size: 11px; }

        .field-input, .field-textarea {
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 12px;
          padding: 13px 16px;
          color: #f0f4f1;
          font-family: 'Outfit', sans-serif;
          font-size: 14px; outline: none;
          transition: border-color 0.2s, background 0.2s;
          resize: none; width: 100%; box-sizing: border-box;
        }
        .field-input:focus, .field-textarea:focus {
          border-color: rgba(90,158,114,0.5);
          background: rgba(90,158,114,0.04);
        }
        .code-input {
          font-size: 20px; font-weight: 500;
          letter-spacing: 0.25em; text-align: center;
          text-transform: uppercase;
        }

        /* Buttons */
        .btn-primary {
          display: flex; align-items: center; justify-content: center; gap: 8px;
          padding: 14px 24px;
          background: linear-gradient(135deg, #5a9e72, #8fd3a8);
          color: #0a0c10; border: none; border-radius: 14px;
          font-family: 'Outfit', sans-serif;
          font-size: 15px; font-weight: 500;
          cursor: pointer;
          transition: opacity 0.2s, transform 0.15s;
          box-shadow: 0 8px 24px rgba(90,158,114,0.3);
        }
        .btn-primary:hover { opacity: 0.9; transform: translateY(-1px); }
        .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }

        /* Spinner */
        .spinner {
          width: 18px; height: 18px;
          border: 2px solid rgba(10,12,16,0.3);
          border-top-color: #0a0c10;
          border-radius: 50%;
          animation: spin 0.7s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }

        /* Invite box */
        .invite-box {
          background: rgba(90,158,114,0.08);
          border: 1px solid rgba(90,158,114,0.2);
          border-radius: 16px;
          padding: 20px;
          display: flex; flex-direction: column; gap: 12px;
        }
        .invite-label {
          font-size: 11px; font-weight: 500;
          color: rgba(143,211,168,0.6);
          text-transform: uppercase; letter-spacing: 0.1em; margin: 0;
        }
        .invite-code-row {
          display: flex; align-items: center; gap: 12px;
        }
        .invite-code {
          font-size: 28px; font-weight: 600;
          letter-spacing: 0.3em; color: #8fd3a8;
          font-family: 'Outfit', sans-serif;
          flex: 1;
        }
        .copy-btn {
          display: flex; align-items: center; gap: 6px;
          padding: 8px 16px;
          background: rgba(90,158,114,0.15);
          border: 1px solid rgba(90,158,114,0.3);
          border-radius: 10px;
          color: #8fd3a8;
          font-family: 'Outfit', sans-serif;
          font-size: 13px; font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
          white-space: nowrap;
        }
        .copy-btn:hover { background: rgba(90,158,114,0.25); }
        .invite-hint {
          font-size: 12px; color: rgba(240,244,241,0.3); margin: 0;
        }

        /* Success icon */
        .success-icon {
          width: 72px; height: 72px;
          background: rgba(90,158,114,0.12);
          border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          color: #8fd3a8;
          margin: 0 auto;
          box-shadow: 0 0 30px rgba(90,158,114,0.2);
        }

        .error-msg {
          color: #ff7b7b; font-size: 13px; margin: 0; text-align: center;
        }
      `}</style>
    </div>
  );
}