import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Id } from "../../convex/_generated/dataModel";
import { TodoCard as TodoCardType } from "../lib/types";
import { PRIORITIES } from "../lib/constants";
import { shortDate, minRead, initials } from "../lib/format";

/** The plain visual face of a card (also used by the drag overlay). */
export function CardFace({
  card,
  dragging,
}: {
  card: TodoCardType;
  dragging?: boolean;
}) {
  const priority = PRIORITIES.find((p) => p.key === card.priority)!;
  const due = card.dueDate;
  const overdue = due !== undefined && due < Date.now() && card.status !== "done";

  return (
    <article className={`card ${dragging ? "is-dragging" : ""}`}>
      <span
        className="card-priority"
        style={{ background: priority.color }}
        title={`${priority.label} priority`}
      />
      <header className="card-top">
        <span className="card-author">
          <span className="card-author-dot" />
          {card.authorName}
        </span>
        <span className="card-date">{shortDate(card._creationTime)}</span>
      </header>

      <h3 className="card-title">{card.title}</h3>

      {card.description && (
        <p className="card-excerpt">
          {card.description.length > 50
            ? card.description.slice(0, 50) + "…"
            : card.description}
        </p>
      )}

      {card.checklistPreview.length > 0 && (
        <ul className="card-checklist-preview">
          {card.checklistPreview.map((item, i) => (
            <li key={i} className={item.done ? "is-done" : ""}>
              <span className="card-check-icon">{item.done ? "☑" : "☐"}</span>
              <span className="card-check-text">{item.text}</span>
            </li>
          ))}
          {card.checklistTotal > 3 && (
            <li className="card-check-more">+{card.checklistTotal - 3} more</li>
          )}
        </ul>
      )}

      {card.tags.length > 0 && (
        <div className="card-tags">
          {card.tags.map((t) => (
            <span key={t} className="chip card-tag">
              {t}
            </span>
          ))}
        </div>
      )}

      <footer className="card-foot">
        <span className="card-meta">
          {card.checklistTotal > 0 && (
            <span className="card-checklist" title="Checklist progress">
              ☑ {card.checklistDone}/{card.checklistTotal}
            </span>
          )}
          {card.commentCount > 0 && (
            <span className="card-comments" title="Comments">
              💬 {card.commentCount}
            </span>
          )}
          {due !== undefined && (
            <span className={`card-due ${overdue ? "is-overdue" : ""}`}>
              ⏷ {shortDate(due)}
            </span>
          )}
        </span>
        <span className="card-read muted">{minRead(card.description)}</span>
      </footer>
    </article>
  );
}

/** Draggable + sortable wrapper used inside a column. */
export default function SortableCard({
  card,
  onOpen,
}: {
  card: TodoCardType;
  onOpen: (id: Id<"todos">) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: card._id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={() => onOpen(card._id)}
      className="card-wrap"
    >
      <CardFace card={card} />
    </div>
  );
}

// Re-export for callers that want the initials helper colocated.
export { initials };
