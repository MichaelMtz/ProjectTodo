import { FormEvent, useState, useCallback } from "react";
import { useMutation } from "convex/react";
import { ConvexError } from "convex/values";
import { api } from "../../convex/_generated/api";
import { useToken } from "../auth";
import { initials } from "../lib/format";

type Role = "developer" | "manager";

export default function ProfileModal({
  name,
  email,
  role,
  onClose,
}: {
  name: string;
  email: string;
  role: Role;
  onClose: () => void;
}) {
  const token = useToken();
  const updateProfile = useMutation(api.users.updateProfile);
  const changePassword = useMutation(api.users.changePassword);

  const [tab, setTab] = useState<"profile" | "password">("profile");

  // Profile tab
  const [editName, setEditName] = useState(name);
  const [editRole, setEditRole] = useState<Role>(role);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMsg, setProfileMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const profileDirty = editName.trim() !== name || editRole !== role;

  // Password tab
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [pwSaving, setPwSaving] = useState(false);
  const [pwMsg, setPwMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const toggleCurrent = useCallback(() => setShowCurrent((v) => !v), []);
  const toggleNew = useCallback(() => setShowNew((v) => !v), []);
  const toggleConfirm = useCallback(() => setShowConfirm((v) => !v), []);

  async function handleProfileSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = editName.trim();
    if (!trimmed) return;
    if (!profileDirty) return;
    setProfileSaving(true);
    setProfileMsg(null);
    try {
      await updateProfile({ token, name: trimmed, role: editRole });
      setProfileMsg({ ok: true, text: "Profile updated." });
    } catch (err) {
      setProfileMsg({
        ok: false,
        text: err instanceof ConvexError ? String(err.data) : "Could not update profile.",
      });
    } finally {
      setProfileSaving(false);
    }
  }

  async function handlePasswordSubmit(e: FormEvent) {
    e.preventDefault();
    setPwMsg(null);
    if (newPw !== confirmPw) {
      setPwMsg({ ok: false, text: "New passwords do not match." });
      return;
    }
    if (newPw.length < 6) {
      setPwMsg({ ok: false, text: "New password must be at least 6 characters." });
      return;
    }
    setPwSaving(true);
    try {
      await changePassword({ token, currentPassword: currentPw, newPassword: newPw });
      setPwMsg({ ok: true, text: "Password changed." });
      setCurrentPw("");
      setNewPw("");
      setConfirmPw("");
    } catch (err) {
      setPwMsg({
        ok: false,
        text: err instanceof ConvexError ? String(err.data) : "Could not change password.",
      });
    } finally {
      setPwSaving(false);
    }
  }

  const EyeIcon = (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );

  const EyeOffIcon = (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );

  return (
    <div className="profile-overlay" onClick={onClose}>
      <div className="profile-modal" onClick={(e) => e.stopPropagation()}>
        <div className="profile-header">
          <span className="profile-avatar">{initials(name || email)}</span>
          <div className="profile-header-meta">
            <span className="profile-header-name">{name || email.split("@")[0]}</span>
            <span className="profile-header-email">{email}</span>
          </div>
          <button className="icon-btn profile-close" onClick={onClose} title="Close">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="profile-tabs">
          <button
            className={`profile-tab ${tab === "profile" ? "is-active" : ""}`}
            onClick={() => { setTab("profile"); setPwMsg(null); }}
          >
            Profile
          </button>
          <button
            className={`profile-tab ${tab === "password" ? "is-active" : ""}`}
            onClick={() => { setTab("password"); setProfileMsg(null); }}
          >
            Password
          </button>
        </div>

        {tab === "profile" && (
          <form className="profile-form" onSubmit={handleProfileSubmit}>
            <label className="profile-label">Display Name</label>
            <input
              className="input"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              placeholder="Your name"
              autoFocus
            />
            <label className="profile-label">Role</label>
            <select
              className="input users-role-select"
              value={editRole}
              onChange={(e) => setEditRole(e.target.value as Role)}
            >
              <option value="developer">Developer</option>
              <option value="manager">Manager</option>
            </select>
            <label className="profile-label">Email</label>
            <input className="input" value={email} disabled />
            {profileMsg && (
              <div className={`profile-msg ${profileMsg.ok ? "is-ok" : "is-err"}`}>
                {profileMsg.text}
              </div>
            )}
            <button
              className="btn btn--primary profile-save"
              type="submit"
              disabled={profileSaving || !profileDirty}
            >
              {profileSaving ? "Saving…" : "Save"}
            </button>
          </form>
        )}

        {tab === "password" && (
          <form className="profile-form" onSubmit={handlePasswordSubmit}>
            <label className="profile-label">Current Password</label>
            <div className="password-field">
              <input
                className="input"
                type={showCurrent ? "text" : "password"}
                value={currentPw}
                onChange={(e) => setCurrentPw(e.target.value)}
                autoComplete="current-password"
                required
                autoFocus
              />
              <button type="button" className="password-toggle" onClick={toggleCurrent} tabIndex={-1} aria-label={showCurrent ? "Hide" : "Show"}>
                {showCurrent ? EyeOffIcon : EyeIcon}
              </button>
            </div>

            <label className="profile-label">New Password</label>
            <div className="password-field">
              <input
                className="input"
                type={showNew ? "text" : "password"}
                value={newPw}
                onChange={(e) => setNewPw(e.target.value)}
                autoComplete="new-password"
                required
              />
              <button type="button" className="password-toggle" onClick={toggleNew} tabIndex={-1} aria-label={showNew ? "Hide" : "Show"}>
                {showNew ? EyeOffIcon : EyeIcon}
              </button>
            </div>

            <label className="profile-label">Confirm New Password</label>
            <div className="password-field">
              <input
                className="input"
                type={showConfirm ? "text" : "password"}
                value={confirmPw}
                onChange={(e) => setConfirmPw(e.target.value)}
                autoComplete="new-password"
                required
              />
              <button type="button" className="password-toggle" onClick={toggleConfirm} tabIndex={-1} aria-label={showConfirm ? "Hide" : "Show"}>
                {showConfirm ? EyeOffIcon : EyeIcon}
              </button>
            </div>

            {pwMsg && (
              <div className={`profile-msg ${pwMsg.ok ? "is-ok" : "is-err"}`}>
                {pwMsg.text}
              </div>
            )}
            <button
              className="btn btn--primary profile-save"
              type="submit"
              disabled={pwSaving || !currentPw || !newPw || !confirmPw}
            >
              {pwSaving ? "Changing…" : "Change Password"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
