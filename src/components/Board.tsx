import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
  DragStartEvent,
  DragOverEvent,
  DragEndEvent,
} from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";
import { api } from "../../convex/_generated/api";
import { Doc, Id } from "../../convex/_generated/dataModel";
import { useToken } from "../auth";
import { COLUMNS, Status } from "../lib/constants";
import { TodoCard } from "../lib/types";
import Column from "./Column";
import { CardFace } from "./TodoCard";
import TodoModal from "./TodoModal";
import "../styles/board.css";

type Phase = Doc<"phases">;
type Grouped = Record<Status, TodoCard[]>;

function group(todos: TodoCard[]): Grouped {
  const base: Grouped = { todo: [], in_progress: [], in_review: [], done: [] };
  for (const t of todos) base[t.status].push(t);
  for (const key of Object.keys(base) as Status[]) {
    base[key].sort((a, b) => a.order - b.order);
  }
  return base;
}

export default function Board({ phase }: { phase: Phase }) {
  const token = useToken();
  const [search, setSearch] = useState("");
  const [authorFilter, setAuthorFilter] = useState<string>("");
  const [tag, setTag] = useState<string>("");
  const [openId, setOpenId] = useState<Id<"todos"> | null>(null);

  const todos = useQuery(api.todos.listByPhase, {
    token,
    phaseId: phase._id,
    search: search || undefined,
  });
  const createTodo = useMutation(api.todos.create);
  const setColumnMut = useMutation(api.todos.setColumn);

  // Local, reorderable copy of the grouped cards for smooth drag.
  const [columns, setColumns] = useState<Grouped>(group([]));
  const activeIdRef = useRef<Id<"todos"> | null>(null);
  const [activeId, setActiveId] = useState<Id<"todos"> | null>(null);

  // Filters applied before grouping.
  const filtered = useMemo(() => {
    if (!todos) return undefined;
    return todos.filter(
      (t) =>
        (!authorFilter || t.authorId === authorFilter) &&
        (!tag || t.tags.includes(tag)),
    );
  }, [todos, authorFilter, tag]);

  // Sync local columns from the server query unless mid-drag.
  useEffect(() => {
    if (filtered && activeIdRef.current === null) {
      setColumns(group(filtered));
    }
  }, [filtered]);

  const allAuthors = useMemo(() => {
    const map = new Map<string, string>();
    for (const t of todos ?? []) {
      if (!map.has(t.authorId)) map.set(t.authorId, t.authorName);
    }
    return [...map.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  }, [todos]);

  const allTags = useMemo(
    () => [...new Set((todos ?? []).flatMap((t) => t.tags))],
    [todos],
  );

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  function findContainer(id: string): Status | null {
    if (COLUMNS.some((c) => c.key === id)) return id as Status;
    for (const key of Object.keys(columns) as Status[]) {
      if (columns[key].some((t) => t._id === id)) return key;
    }
    return null;
  }

  function handleDragStart(e: DragStartEvent) {
    activeIdRef.current = e.active.id as Id<"todos">;
    setActiveId(e.active.id as Id<"todos">);
  }

  function handleDragOver(e: DragOverEvent) {
    const { active, over } = e;
    if (!over) return;
    const from = findContainer(active.id as string);
    const to = findContainer(over.id as string);
    if (!from || !to || from === to) return;

    setColumns((prev) => {
      const fromItems = [...prev[from]];
      const toItems = [...prev[to]];
      const movingIndex = fromItems.findIndex((t) => t._id === active.id);
      if (movingIndex === -1) return prev;
      const [moving] = fromItems.splice(movingIndex, 1);
      const overIndex = toItems.findIndex((t) => t._id === over.id);
      const insertAt = overIndex === -1 ? toItems.length : overIndex;
      toItems.splice(insertAt, 0, { ...moving, status: to });
      return { ...prev, [from]: fromItems, [to]: toItems };
    });
  }

  function handleDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    activeIdRef.current = null;
    setActiveId(null);
    if (!over) return;

    const container = findContainer(over.id as string);
    if (!container) return;

    setColumns((prev) => {
      const items = [...prev[container]];
      const oldIndex = items.findIndex((t) => t._id === active.id);
      const overIndex = items.findIndex((t) => t._id === over.id);
      const next =
        oldIndex !== -1 && overIndex !== -1 && oldIndex !== overIndex
          ? arrayMove(items, oldIndex, overIndex)
          : items;
      // Persist the destination column order + status.
      void setColumnMut({
        token,
        todoId: active.id as Id<"todos">,
        status: container,
        orderedIds: next.map((t) => t._id),
      });
      return { ...prev, [container]: next };
    });
  }

  async function handleNew() {
    const id = await createTodo({ token, phaseId: phase._id, status: "todo" });
    setOpenId(id);
  }

  const activeCard =
    activeId !== null
      ? Object.values(columns)
          .flat()
          .find((t) => t._id === activeId) ?? null
      : null;

  return (
    <div className="board">
      <header className="board-header">
        <h1 className="board-title">{phase.name}</h1>
        <div className="board-search">
          <span className="search-icon">⌕</span>
          <input
            className="search-input"
            placeholder="Search todos…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          className="board-filter"
          value={authorFilter}
          onChange={(e) => setAuthorFilter(e.target.value)}
        >
          <option value="">All users</option>
          {allAuthors.map(([id, name]) => (
            <option key={id} value={id}>
              {name}
            </option>
          ))}
        </select>
        <select className="board-filter" value={tag} onChange={(e) => setTag(e.target.value)}>
          <option value="">All tags</option>
          {allTags.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        <div className="board-spacer" />
        <button className="btn btn--primary" onClick={handleNew}>
          ＋ New todo
        </button>
      </header>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className="board-columns">
          {COLUMNS.map((col) => (
            <Column
              key={col.key}
              column={col}
              cards={columns[col.key]}
              onOpen={setOpenId}
            />
          ))}
        </div>
        <DragOverlay>
          {activeCard ? <CardFace card={activeCard} dragging /> : null}
        </DragOverlay>
      </DndContext>

      {openId && <TodoModal todoId={openId} onClose={() => setOpenId(null)} />}
    </div>
  );
}
