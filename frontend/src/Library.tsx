import { useEffect, useState } from "react";
import { clipsApi, ruleSetsApi } from "./lib/api";
import type { Clip, RuleSet } from "./lib/types";
import { navigate } from "./lib/router";
import "./Library.css";

export default function Library() {
  const [clips, setClips] = useState<Clip[] | null>(null);
  const [ruleSets, setRuleSets] = useState<RuleSet[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([clipsApi.list(), ruleSetsApi.list()])
      .then(([c, rs]) => {
        setClips(c);
        setRuleSets(rs);
      })
      .catch((err) => setError(err.message));
  }, []);

  const ruleSetName = (id: string | null) => ruleSets.find((rs) => rs.id === id)?.name;

  return (
    <div className="library">
      <div className="library-head">
        <h1>Library</h1>
        <button className="btn btn-primary" onClick={() => navigate("/new")}>
          + New Clip
        </button>
      </div>

      {error && <p className="library-error">{error}</p>}

      {clips === null ? (
        <p className="library-empty">Loading…</p>
      ) : clips.length === 0 ? (
        <p className="library-empty">No clips yet. Start your first one.</p>
      ) : (
        <div className="library-grid">
          {clips.map((clip) => (
            <button key={clip.id} className="clip-card" onClick={() => navigate(`/clip?id=${clip.id}`)}>
              <div className="clip-card-head">
                <span className={`tag tag-${clip.status}`}>{clip.status}</span>
                <span className="clip-card-runtime">{clip.runtime}</span>
              </div>
              <h2>{clip.title}</h2>
              {ruleSetName(clip.rule_set_id) && <p className="clip-card-genre">{ruleSetName(clip.rule_set_id)}</p>}
              <p className="clip-card-date">Updated {new Date(clip.updated_at).toLocaleDateString()}</p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
