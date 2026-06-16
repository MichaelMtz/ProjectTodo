import { FormEvent, useState, useCallback } from "react";
import { useQuery, useMutation } from "convex/react";
import { ConvexError } from "convex/values";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { useToken } from "../auth";
import { initials } from "../lib/format";

type Role = "developer" | "manager";
type EditingUser = {
  _id: Id<"users">;
  name: string;
  role: Role;
};

function formatLastLogin(ts?: number): string {
  if (!ts) return "Never";
  const d = new Date(ts);
  const now = Date.now();
  const diff = now - ts;
  if (diff < 60_000) return "Just now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export default function UsersModal({ onClose }: { onClose: () => void }) {
  const token = useToken();
  const users = useQuery(api.users.list, { token });
  const addUserMut = useMutation(api.users.addUser);
  const updateUserMut = useMutation(api.users.updateUser);
  const deleteUserMut = useMutation(api.users.deleteUser);

  const [view, setView] = useState<"list" | "add">("list");
  const [editing, setEditing] = useState<EditingUser | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Add form
  const [addEmail, setAddEmail] = useState("");
  const [addName, setAddName] = useState("");
  const [addPassword, setAddPassword] = useState("");
  const [addRole, setAddRole] = useState<Role>("manager");
  const [showAddPw, setShowAddPw] = useState(false);
  const toggleAddPw = useCallback(() => setShowAddPw((v) => !v), []);

  function resetAdd() {
    setAddEmail("");
    setAddName("");
    setAddPassword("");
    setAddRole("manager");
    setShowAddPw(false);
    setError(null);
  }

  async function handleAdd(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      await addUserMut({
        token,
        email: addEmail,
        name: addName || undefined,
        password: addPassword,
        role: addRole,
      });
      resetAdd();
      setView("list");
    } catch (err) {
      setError(err instanceof ConvexError ? String(err.data) : "Could not add user.");
    } finally {
      setSaving(false);
    }
  }

  async function handleEditSave() {
    if (!editing) return;
    setError(null);
    setSaving(true);
    try {
      await updateUserMut({
        token,
        userId: editing._id,
        name: editing.name,
        role: editing.role,
      });
      setEditing(null);
    } catch (err) {
      setError(err instanceof ConvexError ? String(err.data) : "Could not update user.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(userId: Id<"users">, email: string) {
    if (!confirm(`Delete user "${email}"? This cannot be undone.`)) return;
    setError(null);
    try {
      await deleteUserMut({ token, userId });
    } catch (err) {
      setError(err instanceof ConvexError ? String(err.data) : "Could not delete user.");
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
      <div className="users-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="users-modal-head">
          <h2 className="users-modal-title">
            {view === "add" ? "Add User" : editing ? "Edit User" : "Users"}
          </h2>
          <button className="icon-btn" onClick={onClose} title="Close">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {error && <div className="users-error">{error}</div>}

        {/* ---- LIST VIEW ---- */}
        {view === "list" && !editing && (
          <>
            <div className="users-list">
              {users === undefined && <div className="users-empty">Loading…</div>}
              {users && users.length === 0 && <div className="users-empty">No users yet.</div>}
              {users?.map((u) => (
                <div key={u._id} className="users-row">
                  <span className="user-avatar users-row-avatar">
                    {initials(u.name || u.email)}
                  </span>
                  <div className="users-row-info">
                    <span className="users-row-name">{u.name || u.email.split("@")[0]}</span>
                    <span className="users-row-email">{u.email}</span>
                  </div>
                  <span className={`users-role-badge role-${u.role ?? "manager"}`}>
                    {u.role ?? "manager"}
                  </span>
                  <span className="users-row-login">{formatLastLogin(u.lastLogin)}</span>
                  <div className="users-row-actions">
                    <button
                      className="icon-btn"
                      title="Edit user"
                      onClick={() => {
                        setError(null);
                        setEditing({
                          _id: u._id,
                          name: u.name ?? "",
                          role: u.role ?? "manager",
                        });
                      }}
                    >
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                      </svg>
                    </button>
                    <button
                      className="icon-btn users-row-del"
                      title="Delete user"
                      onClick={() => handleDelete(u._id, u.email)}
                    >
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                        <path d="M10 11v6" />
                        <path d="M14 11v6" />
                        <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <button
              className="btn btn--primary users-add-btn"
              onClick={() => { resetAdd(); setView("add"); }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              Add User
            </button>
          </>
        )}

        {/* ---- ADD VIEW ---- */}
        {view === "add" && (
          <form className="users-form" onSubmit={handleAdd}>
            <label className="profile-label">Email</label>
            <input
              className="input"
              type="email"
              value={addEmail}
              onChange={(e) => setAddEmail(e.target.value)}
              placeholder="user@example.com"
              required
              autoFocus
            />
            <label className="profile-label">Name</label>
            <input
              className="input"
              value={addName}
              onChange={(e) => setAddName(e.target.value)}
              placeholder="Display name"
            />
            <label className="profile-label">Password</label>
            <div className="password-field">
              <input
                className="input"
                type={showAddPw ? "text" : "password"}
                value={addPassword}
                onChange={(e) => setAddPassword(e.target.value)}
                placeholder="Min 6 characters"
                required
              />
              <button type="button" className="password-toggle" onClick={toggleAddPw} tabIndex={-1}>
                {showAddPw ? EyeOffIcon : EyeIcon}
              </button>
            </div>
            <label className="profile-label">Role</label>
            <select
              className="input users-role-select"
              value={addRole}
              onChange={(e) => setAddRole(e.target.value as Role)}
            >
              <option value="developer">Developer</option>
              <option value="manager">Manager</option>
            </select>
            <div className="users-form-actions">
              <button
                type="button"
                className="btn btn--ghost"
                onClick={() => { resetAdd(); setView("list"); }}
              >
                Cancel
              </button>
              <button className="btn btn--primary" type="submit" disabled={saving}>
                {saving ? "Adding…" : "Add User"}
              </button>
            </div>
          </form>
        )}

        {/* ---- EDIT VIEW ---- */}
        {editing && (
          <div className="users-form">
            <label className="profile-label">Name</label>
            <input
              className="input"
              value={editing.name}
              onChange={(e) => setEditing({ ...editing, name: e.target.value })}
              placeholder="Display name"
              autoFocus
            />
            <label className="profile-label">Role</label>
            <select
              className="input users-role-select"
              value={editing.role}
              onChange={(e) => setEditing({ ...editing, role: e.target.value as Role })}
            >
              <option value="developer">Developer</option>
              <option value="manager">Manager</option>
            </select>
            <div className="users-form-actions">
              <button
                type="button"
                className="btn btn--ghost"
                onClick={() => { setEditing(null); setError(null); }}
              >
                Cancel
              </button>
              <button
                className="btn btn--primary"
                onClick={handleEditSave}
                disabled={saving}
              >
                {saving ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
