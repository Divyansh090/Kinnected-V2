"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

export default function OnboardingPage() {
  const router = useRouter();
  // update() forces NextAuth to re-fetch the JWT from the server
  const { data: session, update } = useSession();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const [form, setForm] = useState({
    profilePhoto: "",
    bio: "",
    dateOfBirth: "",
    location: "",
  });

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      setPreviewUrl(result);
      setForm((prev) => ({ ...prev, profilePhoto: result }));
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Something went wrong");

      // ✅ Force NextAuth to refresh the JWT token so middleware
      // sees isProfileComplete = true before we navigate away
      await update({ isProfileComplete: true });

      // Hard redirect — avoids any middleware loop
      window.location.href = "/dashboard";
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  const handleSkip = async () => {
    // Even on skip, mark complete so user isn't stuck
    try {
      await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, skipOnboarding: true }),
      });
      await update({ isProfileComplete: true });
    } catch (_) {}
    window.location.href = "/dashboard";
  };

  const firstName = session?.user?.name?.split(" ")[0] ?? "there";

  return (
    <div className="root">
      <div className="bg-orbs">
        <div className="orb orb-1" />
        <div className="orb orb-2" />
        <div className="orb orb-3" />
      </div>

      <div className="card">
        {/* Logo */}
        <div className="logo">
          <div className="logo-mark">K</div>
          <span className="logo-word">innected</span>
        </div>

        {/* Heading */}
        <div className="heading">
          <h1 className="title">Hey, {firstName} 👋</h1>
          <p className="subtitle">
            Let's set up your profile before you meet your family on Kinnected.
          </p>
        </div>

        {/* Avatar upload */}
        <div className="avatar-section">
          <div
            className="avatar-upload"
            onClick={() => fileInputRef.current?.click()}
          >
            {previewUrl ? (
              <img src={previewUrl} alt="Preview" className="avatar-img" />
            ) : (
              <div className="avatar-placeholder">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
                <span>Upload photo</span>
              </div>
            )}
            <div className="avatar-overlay">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                <circle cx="12" cy="13" r="4" />
              </svg>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden-input"
              onChange={handleImageChange}
            />
          </div>
          <p className="avatar-hint">Optional — you can add one later</p>
        </div>

        {/* Fields */}
        <div className="fields">
          <div className="field">
            <label className="label">Bio</label>
            <textarea
              className="textarea"
              placeholder="A little about yourself…"
              value={form.bio}
              onChange={(e) => setForm((p) => ({ ...p, bio: e.target.value }))}
              rows={3}
            />
          </div>

          <div className="field-row">
            <div className="field">
              <label className="label">Date of Birth</label>
              <input
                type="date"
                className="input"
                value={form.dateOfBirth}
                onChange={(e) =>
                  setForm((p) => ({ ...p, dateOfBirth: e.target.value }))
                }
              />
            </div>
            <div className="field">
              <label className="label">Location</label>
              <input
                type="text"
                className="input"
                placeholder="City, Country"
                value={form.location}
                onChange={(e) =>
                  setForm((p) => ({ ...p, location: e.target.value }))
                }
              />
            </div>
          </div>
        </div>

        {error && <p className="error">{error}</p>}

        <button className="btn" onClick={handleSubmit} disabled={loading}>
          {loading ? (
            <span className="spinner" />
          ) : (
            <>
              Continue to Dashboard
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </>
          )}
        </button>

        <p className="skip" onClick={handleSkip}>
          Skip for now →
        </p>
      </div>

      <style jsx>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@500;700&family=DM+Sans:wght@300;400;500&display=swap');
        * { box-sizing: border-box; }
        .root {
          min-height: 100vh;
          display: flex; align-items: center; justify-content: center;
          background: #0d0f14; padding: 24px;
          font-family: 'DM Sans', sans-serif;
          position: relative; overflow: hidden;
        }
        .bg-orbs { position: fixed; inset: 0; pointer-events: none; z-index: 0; }
        .orb {
          position: absolute; border-radius: 50%;
          filter: blur(80px); opacity: 0.3;
          animation: float 8s ease-in-out infinite;
        }
        .orb-1 { width: 400px; height: 400px; background: #c9783a; top: -120px; left: -100px; animation-delay: 0s; }
        .orb-2 { width: 280px; height: 280px; background: #7c4a1e; bottom: -80px; right: -60px; animation-delay: 3s; }
        .orb-3 { width: 180px; height: 180px; background: #e8a87c; top: 55%; left: 55%; animation-delay: 1.5s; }
        @keyframes float {
          0%, 100% { transform: translateY(0) scale(1); }
          50% { transform: translateY(-18px) scale(1.04); }
        }
        .card {
          position: relative; z-index: 1;
          width: 100%; max-width: 480px;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 28px; padding: 40px;
          backdrop-filter: blur(20px);
          box-shadow: 0 32px 80px rgba(0,0,0,0.5);
          display: flex; flex-direction: column; gap: 28px;
        }
        .logo { display: flex; align-items: center; gap: 6px; }
        .logo-mark {
          width: 38px; height: 38px;
          background: linear-gradient(135deg, #c9783a, #e8a87c);
          border-radius: 11px;
          display: flex; align-items: center; justify-content: center;
          font-family: 'Playfair Display', serif;
          font-size: 20px; font-weight: 700; color: white;
          box-shadow: 0 6px 18px rgba(201,120,58,0.4);
        }
        .logo-word {
          font-family: 'Playfair Display', serif;
          font-size: 20px; font-weight: 500;
          color: rgba(245,240,234,0.8);
        }
        .heading { display: flex; flex-direction: column; gap: 6px; }
        .title {
          font-family: 'Playfair Display', serif;
          font-size: 28px; font-weight: 700; color: #f5f0ea; margin: 0;
        }
        .subtitle { font-size: 14px; color: rgba(245,240,234,0.45); margin: 0; line-height: 1.6; }
        .avatar-section { display: flex; flex-direction: column; align-items: center; gap: 10px; }
        .avatar-upload {
          width: 96px; height: 96px; border-radius: 50%;
          border: 2px dashed rgba(201,120,58,0.35);
          cursor: pointer; position: relative; overflow: hidden;
          transition: border-color 0.2s;
        }
        .avatar-upload:hover { border-color: #c9783a; }
        .avatar-placeholder {
          width: 100%; height: 100%;
          display: flex; flex-direction: column;
          align-items: center; justify-content: center;
          gap: 5px; color: rgba(245,240,234,0.3); font-size: 11px;
        }
        .avatar-img { width: 100%; height: 100%; object-fit: cover; }
        .avatar-overlay {
          position: absolute; inset: 0;
          background: rgba(0,0,0,0.45);
          display: flex; align-items: center; justify-content: center;
          opacity: 0; transition: opacity 0.2s;
        }
        .avatar-upload:hover .avatar-overlay { opacity: 1; }
        .hidden-input { display: none; }
        .avatar-hint { font-size: 11px; color: rgba(245,240,234,0.25); }
        .fields { display: flex; flex-direction: column; gap: 16px; }
        .field { display: flex; flex-direction: column; gap: 6px; flex: 1; }
        .field-row { display: flex; gap: 14px; }
        .label {
          font-size: 11px; font-weight: 500; color: rgba(245,240,234,0.4);
          text-transform: uppercase; letter-spacing: 0.08em;
        }
        .input, .textarea {
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 12px; padding: 11px 14px;
          color: #f5f0ea; font-family: 'DM Sans', sans-serif;
          font-size: 14px; outline: none;
          transition: border-color 0.2s, background 0.2s;
          resize: none; width: 100%;
        }
        .input:focus, .textarea:focus {
          border-color: rgba(201,120,58,0.5);
          background: rgba(255,255,255,0.07);
        }
        input[type="date"]::-webkit-calendar-picker-indicator { filter: invert(0.5); }
        .btn {
          display: flex; align-items: center; justify-content: center; gap: 8px;
          padding: 14px 24px;
          background: linear-gradient(135deg, #c9783a, #e8a87c);
          color: white; border: none; border-radius: 14px;
          font-family: 'DM Sans', sans-serif;
          font-size: 15px; font-weight: 500; cursor: pointer;
          transition: opacity 0.2s, transform 0.15s;
          box-shadow: 0 8px 24px rgba(201,120,58,0.35);
        }
        .btn:hover { opacity: 0.9; transform: translateY(-1px); }
        .btn:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }
        .spinner {
          width: 18px; height: 18px;
          border: 2px solid rgba(255,255,255,0.3);
          border-top-color: white; border-radius: 50%;
          animation: spin 0.7s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        .skip {
          text-align: center; font-size: 13px;
          color: rgba(245,240,234,0.3); cursor: pointer;
          margin: -12px 0 0; transition: color 0.2s;
        }
        .skip:hover { color: rgba(245,240,234,0.6); }
        .error { color: #ff6b6b; font-size: 13px; text-align: center; margin: 0; }
      `}</style>
    </div>
  );
}