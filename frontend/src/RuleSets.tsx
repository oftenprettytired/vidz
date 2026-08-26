import { useEffect, useState } from "react";
import { ruleSetsApi } from "./lib/api";
import type { RuleSet } from "./lib/types";
import "./RuleSets.css";

export default function RuleSets() {
  const [ruleSets, setRuleSets] = useState<RuleSet[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | "new" | null>(null);
  const [name, setName] = useState("");
  const [rules, setRules] = useState("");
  const [saving, setSaving] = useState(false);

  const load = () => {
    ruleSetsApi
      .list()
      .then(setRuleSets)
      .catch((err) => setError(err.message));
  };

  useEffect(load, []);

  const startNew = () => {
    setEditingId("new");
    setName("");
    setRules("");
  };

  const startEdit = (rs: RuleSet) => {
    setEditingId(rs.id);
    setName(rs.name);
    setRules(rs.rules);
  };

  const cancel = () => setEditingId(null);

  const save = async () => {
    if (!name.trim() || !rules.trim()) return;
    setSaving(true);
    setError(null);
    try {
      if (editingId === "new") {
        await ruleSetsApi.create(name, rules);
      } else if (editingId) {
        await ruleSetsApi.update(editingId, { name, rules });
      }
      setEditingId(null);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this rule set? Clips using it will keep their history but lose the genre link.")) return;
    try {
      await ruleSetsApi.remove(id);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete");
    }
  };

  return (
    <div className="rule-sets">
      <div className="rule-sets-head">
        <h1>Rule Sets</h1>
        {editingId === null && (
          <button className="btn btn-primary" onClick={startNew}>
            + New Rule Set
          </button>
        )}
      </div>
      <p className="rule-sets-sub">
        Genre cheat sheets — the guidelines Claude follows when brainstorming concepts and writing scripts for
        clips tagged with this genre.
      </p>

      {error && <p className="rule-sets-error">{error}</p>}

      {editingId !== null && (
        <div className="rule-set-form">
          <input placeholder="Genre name (e.g. Comedy)" value={name} onChange={(e) => setName(e.target.value)} />
          <textarea
            placeholder="Paste the rules / cheat sheet for this genre..."
            rows={14}
            value={rules}
            onChange={(e) => setRules(e.target.value)}
          />
          <div className="rule-set-form-actions">
            <button className="btn btn-secondary" onClick={cancel} disabled={saving}>
              Cancel
            </button>
            <button className="btn btn-primary" onClick={save} disabled={saving || !name.trim() || !rules.trim()}>
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
        </div>
      )}

      {ruleSets === null ? (
        <p className="rule-sets-empty">Loading…</p>
      ) : ruleSets.length === 0 && editingId === null ? (
        <p className="rule-sets-empty">
          No rule sets yet. Add one for Comedy to get started — paste in your cheat sheet.
        </p>
      ) : (
        <div className="rule-set-list">
          {ruleSets.map((rs) => (
            <div className="rule-set-card" key={rs.id}>
              <div className="rule-set-card-head">
                <h2>{rs.name}</h2>
                <div className="rule-set-card-actions">
                  <button className="btn btn-secondary" onClick={() => startEdit(rs)}>
                    Edit
                  </button>
                  <button className="btn btn-secondary" onClick={() => remove(rs.id)}>
                    Delete
                  </button>
                </div>
              </div>
              <pre className="rule-set-card-rules">{rs.rules}</pre>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
