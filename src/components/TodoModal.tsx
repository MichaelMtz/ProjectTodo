import { useEffect, useState } from "react";
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
  const checklist = useQuery(api.checklist.listByTodo, { token, todoId });
  const comments = useQuery(api.comments.listByTodo, { token, todoId });
  const activity = useQuery(api.activity.listByTodo, { token, todoId });

  const update = useMutation(api.todos.update);
  const removeTodo = useMutation(api.todos.remove);
  const addItem = useMutation(api.checklist.add);
  const toggleItem = useMutation(api.checklist.toggle);
  const removeItem = useMutation(api.checklist.remove);
  const addComment = useMutation(api.comments.add);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [newItem, setNewItem] = useState("");
  const [tagDraft, setTagDraft] = useState("");
  const [comment, setComment] = useState("");
  const [saved, setSaved] = useState(true);

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

  function addTag() {
    const t = tagDraft.trim();
    if (t && !todo!.tags.includes(t)) {
      void save({ tags: [...todo!.tags, t] });
    }
    setTagDraft("");
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
                onKeyDown={(e) => e.key === "Enter" && addTag()}
                onBlur={addTag}
              />
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

function PropRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="prop-row">
      <span className="prop-label">{label}</span>
      {children}
    </div>
  );
}
