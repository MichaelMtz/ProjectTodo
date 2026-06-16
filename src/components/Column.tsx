import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { Id } from "../../convex/_generated/dataModel";
import { Status } from "../lib/constants";
import { TodoCard } from "../lib/types";
import SortableCard from "./TodoCard";

export default function Column({
  column,
  cards,
  onOpen,
}: {
  column: { key: Status; label: string; color: string };
  cards: TodoCard[];
  onOpen: (id: Id<"todos">) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: column.key });

  return (
    <section className={`column ${isOver ? "is-over" : ""}`}>
      <header className="column-header">
        <span className="column-dot" style={{ background: column.color }} />
        <span className="column-label">{column.label}</span>
        <span className="column-count">{cards.length}</span>
      </header>

      <SortableContext
        items={cards.map((c) => c._id)}
        strategy={verticalListSortingStrategy}
      >
        <div ref={setNodeRef} className="column-drop">
          {cards.length === 0 ? (
            <div className="column-empty">Nothing here yet</div>
          ) : (
            cards.map((card) => (
              <SortableCard key={card._id} card={card} onOpen={onOpen} />
            ))
          )}
        </div>
      </SortableContext>
    </section>
  );
}
