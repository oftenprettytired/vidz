import { useEffect, useState } from "react";
import { clipsApi, ruleSetsApi } from "./lib/api";
import type { RuleSet } from "./lib/types";
import { navigate } from "./lib/router";
import "./NewClip.css";

export default function NewClip() {
  const [ruleSets, setRuleSets] = useState<RuleSet[]>([]);
  const [title, setTitle] = useState("");
  const [runtime, setRuntime] = useState("");
  const [ruleSetId, setRuleSetId] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    ruleSetsApi.list().then(setRuleSets).catch(() => {});
  }, []);

  const create = async () => {
    if (!title.trim() || !runtime.trim()) return;
    setCreating(true);
    setError(null);
    try {
      const clip = await clipsApi.create(title.trim(), runtime.trim(), ruleSetId || null);
      navigate(`/clip?id=${clip.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create clip");
      setCreating(false);
    }
  };

  return (
    <div className="new-clip">
      <h1>New Clip</h1>
      <p className="new-clip-sub">Set the basics, then we'll head to the concept workspace to talk it through.</p>

      <div className="new-clip-form">
        <label>
          Title
          <input placeholder="Working title" value={title} onChange={(e) => setTitle(e.target.value)} />
        </label>

        <label>
          Runtime
          <input
            placeholder="e.g. 30 seconds"
            value={runtime}
            onChange={(e) => setRuntime(e.target.value)}
          />
        </label>

        <label>
          Genre / Rule Set
          <select value={ruleSetId} onChange={(e) => setRuleSetId(e.target.value)}>
            <option value="">No rule set</option>
            {ruleSets.map((rs) => (
              <option key={rs.id} value={rs.id}>
                {rs.name}
              </option>
            ))}
          </select>
          {ruleSets.length === 0 && (
            <span className="new-clip-hint">
              No rule sets yet — add one on the{" "}
              <a
                href="#/rules"
                onClick={(e) => {
                  e.preventDefault();
                  navigate("/rules");
                }}
              >
                Rule Sets
              </a>{" "}
              page first if you want genre rules applied.
            </span>
          )}
        </label>

        {error && <p className="new-clip-error">{error}</p>}

        <div className="new-clip-actions">
          <button className="btn btn-secondary" onClick={() => navigate("/")} disabled={creating}>
            Cancel
          </button>
          <button className="btn btn-primary" onClick={create} disabled={creating || !title.trim() || !runtime.trim()}>
            {creating ? "Creating…" : "Start Concept →"}
          </button>
        </div>
      </div>
    </div>
  );
}
