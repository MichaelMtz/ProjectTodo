import { useEffect, useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { useAuth, useToken } from "../auth";
import Sidebar from "./Sidebar";
import Board from "./Board";
import "../styles/shell.css";

export default function Shell() {
  const token = useToken();
  const { user } = useAuth();
  const phases = useQuery(api.phases.list, { token });
  const ensureSeeded = useMutation(api.phases.ensureSeeded);

  const [selectedId, setSelectedId] = useState<Id<"phases"> | null>(null);
  const [seedTried, setSeedTried] = useState(false);

  // Seed default phases once if the workspace is empty.
  useEffect(() => {
    if (phases && phases.length === 0 && !seedTried) {
      setSeedTried(true);
      void ensureSeeded({ token });
    }
  }, [phases, seedTried, ensureSeeded, token]);

  // Keep a valid phase selected.
  useEffect(() => {
    if (!phases) return;
    if (phases.length === 0) {
      setSelectedId(null);
      return;
    }
    if (!selectedId || !phases.some((p) => p._id === selectedId)) {
      setSelectedId(phases[0]._id);
    }
  }, [phases, selectedId]);

  const selectedPhase = phases?.find((p) => p._id === selectedId) ?? null;

  return (
    <div className="shell">
      <Sidebar
        phases={phases ?? []}
        selectedId={selectedId}
        onSelect={setSelectedId}
        me={user}
      />
      <main className="shell-main">
        {selectedPhase ? (
          <Board phase={selectedPhase} />
        ) : (
          <div className="shell-empty">
            {phases === undefined ? "Loading…" : "Create a phase to get started."}
          </div>
        )}
      </main>
    </div>
  );
}
