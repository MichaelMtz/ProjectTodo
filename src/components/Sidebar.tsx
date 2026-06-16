import { useState } from "react";
import { useMutation } from "convex/react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCenter,
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { api } from "../../convex/_generated/api";
import { Doc, Id } from "../../convex/_generated/dataModel";
import { useAuth, useToken } from "../auth";
import { initials } from "../lib/format";
import ProfileModal from "./ProfileModal";
import UsersModal from "./UsersModal";

type Phase = Doc<"phases">;

export default function Sidebar({
  phases,
  selectedId,
  onSelect,
  me,
}: {
  phases: Phase[];
  selectedId: Id<"phases"> | null;
  onSelect: (id: Id<"phases">) => void;
  me: { name?: string; email?: string; role?: "developer" | "manager" } | null;
}) {
  const { signOut } = useAuth();
  const token = useToken();
  const createPhase = useMutation(api.phases.create);
  const renamePhase = useMutation(api.phases.rename);
  const archivePhase = useMutation(api.phases.archive);
  const reorderPhases = useMutation(api.phases.reorder);

  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<Id<"phases"> | null>(null);
  const [editName, setEditName] = useState("");
  const [editIcon, setEditIcon] = useState("");
  const [profileOpen, setProfileOpen] = useState(false);
  const [usersOpen, setUsersOpen] = useState(false);
  const [draggingId, setDraggingId] = useState<Id<"phases"> | null>(null);

  const displayName = me?.name || me?.email?.split("@")[0] || "You";
  const isDeveloper = me?.role === "developer";

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor),
  );

  function handleDragStart(e: DragStartEvent) {
    setDraggingId(e.active.id as Id<"phases">);
  }

  function handleDragEnd(e: DragEndEvent) {
    setDraggingId(null);
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIndex = phases.findIndex((p) => p._id === active.id);
    const newIndex = phases.findIndex((p) => p._id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    const reordered = arrayMove(phases, oldIndex, newIndex);
    void reorderPhases({ token, orderedIds: reordered.map((p) => p._id) });
  }

  const draggingPhase = draggingId ? phases.find((p) => p._id === draggingId) : null;

  async function submitNew() {
    const name = newName.trim();
    if (name) {
      const id = await createPhase({ token, name, icon: "📋" });
      onSelect(id);
    }
    setNewName("");
    setAdding(false);
  }

  async function submitEdit(id: Id<"phases">) {
    const name = editName.trim();
    if (name) await renamePhase({ token, phaseId: id, name, icon: editIcon || undefined });
    setEditingId(null);
  }

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <span className="brand-mark">✶</span>
        <span className="brand-text">
          Project AI Chat <span className="brand-accent">TodoNotes</span>
        </span>
      </div>

      <div className="sidebar-section-label">Phases</div>
      <nav className="phase-nav">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={phases.map((p) => p._id)} strategy={verticalListSortingStrategy}>
            {phases.map((phase) => (
              <SortablePhaseItem
                key={phase._id}
                phase={phase}
                isActive={selectedId === phase._id}
                isDragging={draggingId === phase._id}
                isEditing={editingId === phase._id}
                editName={editName}
                editIcon={editIcon}
                onSelect={() => onSelect(phase._id)}
                onEditOpen={() => {
                  setEditingId(phase._id);
                  setEditName(phase.name);
                  setEditIcon(phase.icon ?? "📋");
                }}
                onEditNameChange={setEditName}
                onEditIconChange={setEditIcon}
                onEditSave={() => submitEdit(phase._id)}
                onEditCancel={() => setEditingId(null)}
                onArchive={() => {
                  if (confirm(`Archive "${phase.name}"?`)) archivePhase({ token, phaseId: phase._id });
                }}
              />
            ))}
          </SortableContext>
          <DragOverlay>
            {draggingPhase ? (
              <div className="phase-item phase-item--overlay">
                <span className="phase-icon">{draggingPhase.icon ?? "📋"}</span>
                <span className="phase-name">{draggingPhase.name}</span>
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>

        {adding ? (
          <div className="phase-item is-adding">
            <span className="phase-icon">📋</span>
            <input
              className="phase-rename-input"
              value={newName}
              autoFocus
              placeholder="Phase name"
              onChange={(e) => setNewName(e.target.value)}
              onBlur={submitNew}
              onKeyDown={(e) => {
                if (e.key === "Enter") submitNew();
                if (e.key === "Escape") {
                  setAdding(false);
                  setNewName("");
                }
              }}
            />
          </div>
        ) : (
          <button className="phase-add" onClick={() => setAdding(true)}>
            <span className="phase-icon">＋</span>
            <span>Add phase</span>
          </button>
        )}
      </nav>

      <div className="sidebar-footer">
        {isDeveloper && (
          <button className="sidebar-footer-nav-item" onClick={() => setUsersOpen(true)}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
            <span>Users</span>
          </button>
        )}
        <div className="user-card">
          <button
            className="user-card-trigger"
            onClick={() => setProfileOpen(true)}
            title="Edit profile"
          >
            <span className="user-avatar">{initials(displayName)}</span>
            <span className="user-meta">
              <span className="user-name">{displayName}</span>
              <span className="user-email">{me?.email ?? ""}</span>
            </span>
          </button>
          <button className="icon-btn" title="Sign out" onClick={() => signOut()}>
            ⏻
          </button>
        </div>
      </div>

      {profileOpen && (
        <ProfileModal
          name={displayName}
          email={me?.email ?? ""}
          role={me?.role ?? "manager"}
          onClose={() => setProfileOpen(false)}
        />
      )}
      {usersOpen && <UsersModal onClose={() => setUsersOpen(false)} />}
    </aside>
  );
}

const PHASE_ICONS = ["📋", "🧪", "🧱", "🔎", "🛡️", "🚀", "⚙️", "🎯", "📦", "🔧", "💡", "🏗️", "📐", "🧩", "✅", "🗂️"];

function SortablePhaseItem({
  phase,
  isActive,
  isDragging,
  isEditing,
  editName,
  editIcon,
  onSelect,
  onEditOpen,
  onEditNameChange,
  onEditIconChange,
  onEditSave,
  onEditCancel,
  onArchive,
}: {
  phase: Phase;
  isActive: boolean;
  isDragging: boolean;
  isEditing: boolean;
  editName: string;
  editIcon: string;
  onSelect: () => void;
  onEditOpen: () => void;
  onEditNameChange: (v: string) => void;
  onEditIconChange: (v: string) => void;
  onEditSave: () => void;
  onEditCancel: () => void;
  onArchive: () => void;
}) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition } =
    useSortable({ id: phase._id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.35 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`phase-item ${isActive ? "is-active" : ""}`}
      onClick={onSelect}
    >
      <button
        ref={setActivatorNodeRef}
        className="phase-drag-handle"
        {...attributes}
        {...listeners}
        tabIndex={-1}
        title="Drag to reorder"
        onClick={(e) => e.stopPropagation()}
      >
        <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
          <circle cx="5" cy="3" r="1.5" />
          <circle cx="11" cy="3" r="1.5" />
          <circle cx="5" cy="8" r="1.5" />
          <circle cx="11" cy="8" r="1.5" />
          <circle cx="5" cy="13" r="1.5" />
          <circle cx="11" cy="13" r="1.5" />
        </svg>
      </button>

      <span className="phase-icon">{phase.icon ?? "📋"}</span>
      <span className="phase-name">{phase.name}</span>

      {phase.comingSoon && <span className="phase-badge">SOON</span>}

      <button
        className="phase-edit-btn"
        title="Edit phase"
        onClick={(e) => {
          e.stopPropagation();
          onEditOpen();
        }}
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
        </svg>
      </button>

      <button
        className="phase-archive"
        title="Archive phase"
        onClick={(e) => {
          e.stopPropagation();
          onArchive();
        }}
      >
        ✕
      </button>

      {isEditing && (
        <div className="phase-popover" onClick={(e) => e.stopPropagation()}>
          <label className="phase-popover-label">Name</label>
          <input
            className="input phase-popover-input"
            value={editName}
            autoFocus
            onChange={(e) => onEditNameChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") onEditSave();
              if (e.key === "Escape") onEditCancel();
            }}
          />
          <label className="phase-popover-label">Icon</label>
          <div className="phase-icon-grid">
            {PHASE_ICONS.map((icon) => (
              <button
                key={icon}
                type="button"
                className={`phase-icon-option ${editIcon === icon ? "is-selected" : ""}`}
                onClick={() => onEditIconChange(icon)}
              >
                {icon}
              </button>
            ))}
          </div>
          <div className="phase-popover-actions">
            <button className="btn btn--ghost" onClick={onEditCancel}>Cancel</button>
            <button
              className="btn btn--primary"
              onClick={onEditSave}
              disabled={!editName.trim()}
            >
              Save
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
