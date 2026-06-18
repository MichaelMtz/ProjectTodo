import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { useToken } from "../auth";
import { COLUMNS, PRIORITIES, TYPES, Status, Priority, TodoType } from "../lib/constants";
import { relativeTime, dateInputValue, parseDateInput, initials } from "../lib/format";
import "../styles/modal.css";

export default function TodoModal({
  todoId,
  onClose,
}: {
  todoId: Id<"todos">;
  onClose: () => void;
}) {
  const token = useToken();
  const todo = useQuery(api.todos.get, { token, todoId });
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
  const addComment = useMutation(api.comments.add);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [newItem, setNewItem] = useState("");
  const [tagDraft, setTagDraft] = useState("");
  const [comment, setComment] = useState("");
  const [saved, setSaved] = useState(true);
  const [uploading, setUploading] = useState(false);

  // Hydrate local editable fields once the todo loads.
  useEffect(() => {
    if (todo) {
      setTitle(todo.title);
      setDescription(todo.description);
    }
  }, [todo?._id]);

  // Close on Escape.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

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

  if (todo === undefined) {
    return (
      <div className="modal-overlay" onClick={onClose}>
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
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        {/* Left: content */}
        <div className="modal-main">
          <div className="modal-main-head">
            <span className="modal-id muted">
              {TYPES.find((t) => t.key === todo.type)?.icon} {todo._id.slice(-6).toUpperCase()}
            </span>
            <button className="icon-btn modal-close" onClick={onClose}>
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
          <div className="checklist">
            {checklist?.map((item) => (
              <div key={item._id} className="checklist-row">
                <input
                  type="checkbox"
                  checked={item.done}
                  onChange={() => toggleItem({ token, itemId: item._id })}
                />
                <span className={item.done ? "checklist-text is-done" : "checklist-text"}>
                  {item.text}
                </span>
                <button className="checklist-del" onClick={() => removeItem({ token, itemId: item._id })}>
                  ✕
                </button>
              </div>
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
            <button
              className="btn btn--danger"
              onClick={() => {
                if (confirm("Delete this card?")) {
                  void removeTodo({ token, todoId });
                  onClose();
                }
              }}
            >
              Delete card
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function PropRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="prop-row">
      <span className="prop-label">{label}</span>
      {children}
    </div>
  );
}
