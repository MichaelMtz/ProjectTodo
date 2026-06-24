import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import {
  DndContext,
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
import { useToken } from "../auth";
import { COLUMNS, PRIORITIES, TYPES, Status, Priority, TodoType } from "../lib/constants";
import { relativeTime, dateInputValue, parseDateInput, initials } from "../lib/format";
import "../styles/modal.css";

export default function TodoModal({
  todoId: initialTodoId,
  onClose,
}: {
  todoId: Id<"todos">;
  onClose: () => void;
}) {
  const token = useToken();
  const [todoId, setTodoId] = useState(initialTodoId);
  const [navHistory, setNavHistory] = useState<Id<"todos">[]>([]);
  const [phase, setPhase] = useState<"enter" | "visible" | "exit" | "swap">("enter");
  const [pendingNavId, setPendingNavId] = useState<Id<"todos"> | null>(null);
  const [navDirection, setNavDirection] = useState<"forward" | "back">("forward");
  const overlayRef = useRef<HTMLDivElement>(null);

  const todo = useQuery(api.todos.get, { token, todoId });
  const phases = useQuery(api.phases.list, { token });
  const linkCandidates = useQuery(api.todos.listForLink, { token, excludeTodoId: todoId });
  const allTags = useQuery(api.todos.listAllTags, { token });
  const checklist = useQuery(api.checklist.listByTodo, { token, todoId });
  const comments = useQuery(api.comments.listByTodo, { token, todoId });
  const activity = useQuery(api.activity.listByTodo, { token, todoId });

  const attachments = useQuery(api.attachments.listByTodo, { token, todoId });
  const generateUploadUrl = useMutation(api.attachments.generateUploadUrl);
  const saveAttachment = useMutation(api.attachments.save);
  const removeAttachment = useMutation(api.attachments.remove);

  const update = useMutation(api.todos.update);
  const removeTodo = useMutation(api.todos.remove);
  const addItem = useMutation(api.checklist.add);
  const toggleItem = useMutation(api.checklist.toggle);
  const removeItem = useMutation(api.checklist.remove);
  const reorderChecklist = useMutation(api.checklist.reorder);
  const linkChecklistTodo = useMutation(api.checklist.linkTodo);
  const createTodo = useMutation(api.todos.create);
  const addComment = useMutation(api.comments.add);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [newItem, setNewItem] = useState("");
  const [tagDraft, setTagDraft] = useState("");
  const [comment, setComment] = useState("");
  const [saved, setSaved] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [linkPicker, setLinkPicker] = useState<{
    itemId: Id<"checklistItems">;
    itemText: string;
  } | null>(null);
  const [draggingChecklistId, setDraggingChecklistId] = useState<Id<"checklistItems"> | null>(null);

  const checklistSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor),
  );

  // Trigger enter animation on mount.
  useEffect(() => {
    requestAnimationFrame(() => setPhase("visible"));
  }, []);

  // Hydrate local editable fields once the todo loads.
  useEffect(() => {
    if (todo) {
      setTitle(todo.title);
      setDescription(todo.description);
    }
  }, [todo?._id]);

  // Close on Escape with exit animation.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (linkPicker) {
        setLinkPicker(null);
        return;
      }
      handleClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, linkPicker]);

  function handleClose() {
    setPhase("exit");
    setTimeout(onClose, 220);
  }

  function navigateToTodo(targetId: Id<"todos">) {
    setNavDirection("forward");
    setPendingNavId(targetId);
    setPhase("swap");
  }

  function navigateBack() {
    if (navHistory.length === 0) return;
    setNavDirection("back");
    setPendingNavId(navHistory[navHistory.length - 1]);
    setPhase("swap");
  }

  function handleTransitionEnd() {
    if (phase === "swap" && pendingNavId) {
      if (navDirection === "forward") {
        setNavHistory((prev) => [...prev, todoId]);
      } else {
        setNavHistory((prev) => prev.slice(0, -1));
      }
      setTodoId(pendingNavId);
      setPendingNavId(null);
      setTitle("");
      setDescription("");
      setNewItem("");
      setTagDraft("");
      setComment("");
      requestAnimationFrame(() => setPhase("visible"));
    }
  }

  const availableTags = useMemo(() => {
    if (!todo) return [];
    const onTodo = new Set(todo.tags);
    return (allTags ?? []).filter((tag) => !onTodo.has(tag));
  }, [allTags, todo?.tags]);

  const matchingTags = useMemo(() => {
    const query = tagDraft.trim().toLowerCase();
    if (!query) return availableTags;
    return availableTags.filter((tag) => tag.toLowerCase().includes(query));
  }, [availableTags, tagDraft]);

  const phaseNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const p of phases ?? []) map.set(p._id, p.name);
    return map;
  }, [phases]);

  const sortedLinkCandidates = useMemo(() => {
    if (!linkPicker || !linkCandidates) return [];
    return [...linkCandidates]
      .map((t) => ({ ...t, score: titleMatchScore(linkPicker.itemText, t.title) }))
      .sort((a, b) => b.score - a.score || a.title.localeCompare(b.title));
  }, [linkCandidates, linkPicker]);

  const overlayClass = `modal-overlay ${phase === "enter" ? "modal-enter" : phase === "exit" || phase === "swap" ? "modal-exit" : "modal-visible"}`;

  if (todo === undefined) {
    return (
      <div className={overlayClass} onClick={handleClose}>
        <div className="modal" onClick={(e) => e.stopPropagation()}>
          <div className="modal-loading">Loading…</div>
        </div>
      </div>
    );
  }
  if (todo === null) {
    return null;
  }

  async function save(patch: Record<string, unknown>) {
    setSaved(false);
    await update({ token, todoId, ...patch });
    setSaved(true);
  }

  function handleChecklistDragStart(e: DragStartEvent) {
    setDraggingChecklistId(e.active.id as Id<"checklistItems">);
  }

  function handleChecklistDragEnd(e: DragEndEvent) {
    setDraggingChecklistId(null);
    const { active, over } = e;
    if (!checklist || !over || active.id === over.id) return;
    const oldIndex = checklist.findIndex((item) => item._id === active.id);
    const newIndex = checklist.findIndex((item) => item._id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    const reordered = arrayMove(checklist, oldIndex, newIndex);
    void reorderChecklist({ token, todoId, orderedIds: reordered.map((item) => item._id) });
  }

  function addTag(tag: string) {
    const t = tag.trim();
    if (t && !todo!.tags.includes(t)) {
      void save({ tags: [...todo!.tags, t] });
    }
    setTagDraft("");
  }

  function addTagFromDraft() {
    const draft = tagDraft.trim();
    if (!draft) return;
    const existing = (allTags ?? []).find((tag) => tag.toLowerCase() === draft.toLowerCase());
    addTag(existing ?? draft);
  }

  async function handleFileUpload(file: File) {
    setUploading(true);
    try {
      const uploadUrl = await generateUploadUrl({ token });
      const result = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });
      const { storageId } = await result.json();
      await saveAttachment({
        token,
        todoId,
        storageId,
        filename: file.name,
        contentType: file.type,
        size: file.size,
      });
    } catch (err) {
      console.error("Upload failed:", err);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  return (
    <div
      ref={overlayRef}
      className={overlayClass}
      onClick={handleClose}
      onTransitionEnd={handleTransitionEnd}
    >
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        {/* Left: content */}
        <div className="modal-main">
          <div className="modal-main-head">
            {navHistory.length > 0 && (
              <button className="modal-back" title="Back to previous card" onClick={navigateBack}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="19" y1="12" x2="5" y2="12" />
                  <polyline points="12 19 5 12 12 5" />
                </svg>
              </button>
            )}
            <span className="modal-id muted">
              {TYPES.find((t) => t.key === todo.type)?.icon} {todo._id.slice(-6).toUpperCase()}
            </span>
            <button className="icon-btn modal-close" onClick={handleClose}>
              ✕
            </button>
          </div>

          <input
            className="modal-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={() => title !== todo.title && save({ title })}
            placeholder="Untitled"
          />

          <label className="modal-section-label">Description</label>
          <textarea
            className="modal-description"
            value={description}
            placeholder="Add a description… (markdown welcome)"
            onChange={(e) => setDescription(e.target.value)}
            onBlur={() => description !== todo.description && save({ description })}
          />

          <label className="modal-section-label">Attachments</label>
          <div className="attachments">
            <div className="attachments-grid">
              {attachments?.map((a) => (
                <div key={a._id} className="attachment-item">
                  {a.contentType.startsWith("image/") && a.url ? (
                    <a href={a.url} target="_blank" rel="noopener noreferrer" className="attachment-thumb-link">
                      <img src={a.url} alt={a.filename} className="attachment-thumb" />
                    </a>
                  ) : (
                    <a
                      href={a.url ?? "#"}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="attachment-file"
                    >
                      <span className="attachment-file-icon">
                        {a.contentType === "text/html" ? "🌐" :
                         a.contentType.includes("pdf") ? "📄" :
                         a.contentType.includes("word") || a.contentType.includes("document") ? "📝" :
                         "📎"}
                      </span>
                      <span className="attachment-file-name">{a.filename}</span>
                      <span className="attachment-file-size">{formatFileSize(a.size)}</span>
                    </a>
                  )}
                  <button
                    className="attachment-del"
                    title="Remove attachment"
                    onClick={() => removeAttachment({ token, attachmentId: a._id })}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              className="attachment-file-input"
              accept="image/*,.html,.htm,.pdf,.doc,.docx,.txt,.md,.csv,.json,.xml"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void handleFileUpload(file);
              }}
            />
            <button
              className="btn attachment-upload-btn"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              {uploading ? "Uploading…" : "📎 Add attachment"}
            </button>
          </div>

          <label className="modal-section-label">
            Checklist
            {checklist && checklist.length > 0 && (
              <span className="muted">
                {" "}
                {checklist.filter((c) => c.done).length}/{checklist.length}
              </span>
            )}
          </label>
          <DndContext
            sensors={checklistSensors}
            collisionDetection={closestCenter}
            onDragStart={handleChecklistDragStart}
            onDragEnd={handleChecklistDragEnd}
          >
            <SortableContext
              items={checklist?.map((item) => item._id) ?? []}
              strategy={verticalListSortingStrategy}
            >
              <div className="checklist">
                {checklist?.map((item) => (
                  <ChecklistRow
                    key={item._id}
                    item={item}
                    isDragging={draggingChecklistId === item._id}
                    onToggle={() => toggleItem({ token, itemId: item._id })}
                    onRemove={() => removeItem({ token, itemId: item._id })}
                    onNavigate={() => navigateToTodo(item.linkedTodoId!)}
                    onLinkPicker={() => setLinkPicker({ itemId: item._id, itemText: item.text })}
                    onCreateAndLink={async () => {
                      const newTodoId = await createTodo({
                        token,
                        phaseId: todo.phaseId,
                        title: item.text,
                      });
                      await linkChecklistTodo({ token, itemId: item._id, linkedTodoId: newTodoId });
                      navigateToTodo(newTodoId);
                    }}
                  />
                ))}
                <input
                  className="checklist-add"
                  value={newItem}
                  placeholder="+ Add a subtask"
                  onChange={(e) => setNewItem(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && newItem.trim()) {
                      void addItem({ token, todoId, text: newItem });
                      setNewItem("");
                    }
                  }}
                />
              </div>
            </SortableContext>
          </DndContext>

          <label className="modal-section-label">Comments</label>
          <div className="comment-add">
            <input
              className="input"
              value={comment}
              placeholder="Write a comment…"
              onChange={(e) => setComment(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && comment.trim()) {
                  void addComment({ token, todoId, body: comment });
                  setComment("");
                }
              }}
            />
          </div>
          <div className="comment-list">
            {comments?.map((c) => (
              <div key={c._id} className="comment">
                <span className="comment-avatar">{initials(c.authorName)}</span>
                <div>
                  <div className="comment-head">
                    <strong>{c.authorName}</strong>
                    <span className="muted">{relativeTime(c._creationTime)}</span>
                  </div>
                  <div className="comment-body">{c.body}</div>
                </div>
              </div>
            ))}
          </div>

          <label className="modal-section-label">Activity</label>
          <div className="activity-list">
            {activity?.map((a) => (
              <div key={a._id} className="activity-row">
                <span className="activity-dot" />
                <span>
                  <strong>{a.authorName}</strong> {a.message}
                </span>
                <span className="muted activity-time">{relativeTime(a._creationTime)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Right: properties */}
        <aside className="modal-side">
          <div className="modal-side-head">
            <span className={`save-state ${saved ? "" : "is-saving"}`}>
              {saved ? "All changes saved" : "Saving…"}
            </span>
          </div>

          <PropRow label="Status">
            <select
              className="prop-select"
              value={todo.status}
              onChange={(e) => save({ status: e.target.value as Status })}
            >
              {COLUMNS.map((c) => (
                <option key={c.key} value={c.key}>
                  {c.label}
                </option>
              ))}
            </select>
          </PropRow>

          <PropRow label="Priority">
            <select
              className="prop-select"
              value={todo.priority}
              onChange={(e) => save({ priority: e.target.value as Priority })}
            >
              {PRIORITIES.map((p) => (
                <option key={p.key} value={p.key}>
                  {p.label}
                </option>
              ))}
            </select>
          </PropRow>

          <PropRow label="Type">
            <select
              className="prop-select"
              value={todo.type}
              onChange={(e) => save({ type: e.target.value as TodoType })}
            >
              {TYPES.map((t) => (
                <option key={t.key} value={t.key}>
                  {t.label}
                </option>
              ))}
            </select>
          </PropRow>

          <PropRow label="Category">
            <input
              className="prop-input"
              defaultValue={todo.category ?? ""}
              placeholder="None"
              onBlur={(e) => {
                const val = e.target.value.trim();
                if (val !== (todo.category ?? "")) save({ category: val });
              }}
            />
          </PropRow>

          <PropRow label="Start date">
            <input
              type="date"
              className="prop-input"
              value={dateInputValue(todo.startDate)}
              onChange={(e) => save({ startDate: parseDateInput(e.target.value) })}
            />
          </PropRow>

          <PropRow label="Due date">
            <input
              type="date"
              className="prop-input"
              value={dateInputValue(todo.dueDate)}
              onChange={(e) => save({ dueDate: parseDateInput(e.target.value) })}
            />
          </PropRow>

          <PropRow label="Tags">
            <div className="tag-field">
              <div className="tag-editor">
                {todo.tags.map((t) => (
                  <span key={t} className="chip tag-chip">
                    {t}
                    <button onClick={() => save({ tags: todo.tags.filter((x) => x !== t) })}>
                      ✕
                    </button>
                  </span>
                ))}
                <input
                  className="tag-input"
                  value={tagDraft}
                  placeholder="Add tag…"
                  onChange={(e) => setTagDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addTagFromDraft();
                    }
                  }}
                />
              </div>
              {matchingTags.length > 0 ? (
                <div className="tag-suggestions">
                  {matchingTags.map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      className="chip tag-suggestion"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => addTag(tag)}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              ) : tagDraft.trim() ? (
                <div className="tag-suggestions-hint muted">
                  Press Enter to create &ldquo;{tagDraft.trim()}&rdquo;
                </div>
              ) : null}
            </div>
          </PropRow>

          <div className="modal-side-foot">
            <div className="move-phase">
              <label className="move-phase-label">Move to another phase</label>
              <select
                className="prop-select move-phase-select"
                value={todo.phaseId}
                onChange={(e) => {
                  const targetId = e.target.value as Id<"phases">;
                  if (targetId !== todo.phaseId) {
                    void save({ phaseId: targetId });
                  }
                }}
              >
                {phases?.map((p) => (
                  <option key={p._id} value={p._id}>
                    {p.icon ?? "📋"} {p.name}
                  </option>
                ))}
              </select>
            </div>
            <button
              className="btn btn--danger"
              onClick={() => {
                if (confirm("Delete this card?")) {
                  void removeTodo({ token, todoId });
                  handleClose();
                }
              }}
            >
              Delete card
            </button>
          </div>
        </aside>
      </div>

      {linkPicker && (
        <div className="checklist-link-picker-overlay" onClick={() => setLinkPicker(null)}>
          <div className="checklist-link-picker" onClick={(e) => e.stopPropagation()}>
            <div className="checklist-link-picker-head">
              <div>
                <div className="checklist-link-picker-title">Link to existing todo</div>
                <div className="checklist-link-picker-sub muted">
                  Best matches for &ldquo;{linkPicker.itemText}&rdquo;
                </div>
              </div>
              <button className="icon-btn" type="button" onClick={() => setLinkPicker(null)} aria-label="Close">
                ✕
              </button>
            </div>
            <div className="checklist-link-picker-list">
              {sortedLinkCandidates.length === 0 ? (
                <div className="checklist-link-picker-empty muted">No todos available to link.</div>
              ) : (
                sortedLinkCandidates.map((candidate) => (
                  <button
                    key={candidate._id}
                    type="button"
                    className="chip checklist-link-pill"
                    onClick={() => {
                      void linkChecklistTodo({
                        token,
                        itemId: linkPicker.itemId,
                        linkedTodoId: candidate._id,
                      });
                      setLinkPicker(null);
                    }}
                  >
                    <span className="checklist-link-pill-title">{candidate.title}</span>
                    <span className="checklist-link-pill-meta">
                      {phaseNameById.get(candidate.phaseId) ?? "Phase"}
                    </span>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ChecklistRow({
  item,
  isDragging,
  onToggle,
  onRemove,
  onNavigate,
  onLinkPicker,
  onCreateAndLink,
}: {
  item: Doc<"checklistItems">;
  isDragging: boolean;
  onToggle: () => void;
  onRemove: () => void;
  onNavigate: () => void;
  onLinkPicker: () => void;
  onCreateAndLink: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
    id: item._id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`checklist-row${isDragging ? " is-dragging" : ""}`}
      {...attributes}
    >
      <button
        type="button"
        className="checklist-drag-handle"
        aria-label="Reorder subtask"
        {...listeners}
      >
        ⠿
      </button>
      <input type="checkbox" checked={item.done} onChange={onToggle} />
      <span className={item.done ? "checklist-text is-done" : "checklist-text"}>{item.text}</span>
      <button className="checklist-del" onClick={onRemove}>
        ✕
      </button>
      {item.linkedTodoId ? (
        <button
          className="checklist-linked-btn"
          title="Open linked todo"
          onClick={(e) => {
            e.stopPropagation();
            onNavigate();
          }}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
          </svg>
        </button>
      ) : (
        <div className="checklist-row-actions">
          <button
            className="checklist-link-existing"
            title="Link to existing todo"
            onClick={(e) => {
              e.stopPropagation();
              onLinkPicker();
            }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
            </svg>
          </button>
          <button
            className="checklist-create-todo"
            title="Create todo from subtask"
            onClick={() => void onCreateAndLink()}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <line x1="12" y1="8" x2="12" y2="16" />
              <line x1="8" y1="12" x2="16" y2="12" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function titleMatchScore(query: string, title: string): number {
  const a = query.trim().toLowerCase();
  const b = title.trim().toLowerCase();
  if (!a || !b) return 0;
  if (a === b) return 100;
  if (b.includes(a)) return 80;
  if (a.includes(b)) return 70;
  const aWords = a.split(/\s+/).filter((w) => w.length > 1);
  const bWords = b.split(/\s+/);
  let score = 0;
  for (const w of aWords) {
    if (bWords.some((bw) => bw === w)) score += 15;
    else if (b.includes(w)) score += 8;
  }
  return score;
}

function PropRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="prop-row">
      <span className="prop-label">{label}</span>
      {children}
    </div>
  );
}
