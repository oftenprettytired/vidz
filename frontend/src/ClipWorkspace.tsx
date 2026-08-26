import { useEffect, useRef, useState } from "react";
import { clipsApi, aiApi, ruleSetsApi } from "./lib/api";
import type { Clip, RuleSet, ClipStatus } from "./lib/types";
import { navigate } from "./lib/router";
import "./ClipWorkspace.css";

type Tab = "concept" | "script";

export default function ClipWorkspace({ clipId }: { clipId: string }) {
  const [clip, setClip] = useState<Clip | null>(null);
  const [ruleSet, setRuleSet] = useState<RuleSet | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("concept");

  const [chatInput, setChatInput] = useState("");
  const [sending, setSending] = useState(false);
  const [generating, setGenerating] = useState(false);

  const [scriptDraft, setScriptDraft] = useState("");
  const [promptsDraft, setPromptsDraft] = useState("");
  const [savingScript, setSavingScript] = useState(false);
  const [scriptDirty, setScriptDirty] = useState(false);

  const chatEndRef = useRef<HTMLDivElement>(null);

  const load = () => {
    clipsApi
      .get(clipId)
      .then((c) => {
        setClip(c);
        setScriptDraft(c.script ?? "");
        setPromptsDraft(c.prompts ?? "");
        setScriptDirty(false);
        if (c.rule_set_id) {
          ruleSetsApi.list().then((all) => setRuleSet(all.find((rs) => rs.id === c.rule_set_id) ?? null));
        }
      })
      .catch((err) => setError(err.message));
  };

  useEffect(load, [clipId]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [clip?.concept_chat.length]);

  const sendMessage = async () => {
    if (!chatInput.trim() || !clip) return;
    const message = chatInput.trim();
    setChatInput("");
    setSending(true);
    setError(null);
    try {
      const { chat } = await aiApi.conceptChat(clip.id, message);
      setClip({ ...clip, concept_chat: chat });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send message");
      setChatInput(message);
    } finally {
      setSending(false);
    }
  };

  const generateScript = async () => {
    if (!clip) return;
    setGenerating(true);
    setError(null);
    try {
      const updated = await aiApi.generateScript(clip.id);
      setClip(updated);
      setScriptDraft(updated.script ?? "");
      setPromptsDraft(updated.prompts ?? "");
      setScriptDirty(false);
      setTab("script");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate script");
    } finally {
      setGenerating(false);
    }
  };

  const saveScript = async () => {
    if (!clip) return;
    setSavingScript(true);
    setError(null);
    try {
      const updated = await clipsApi.update(clip.id, { script: scriptDraft, prompts: promptsDraft });
      setClip(updated);
      setScriptDirty(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSavingScript(false);
    }
  };

  const setStatus = async (status: ClipStatus) => {
    if (!clip) return;
    try {
      const updated = await clipsApi.update(clip.id, { status });
      setClip(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update status");
    }
  };

  const deleteClip = async () => {
    if (!clip || !confirm(`Delete "${clip.title}"? This can't be undone.`)) return;
    await clipsApi.remove(clip.id);
    navigate("/");
  };

  const exportPdf = async () => {
    if (!clip) return;
    const { exportClipPdf } = await import("./lib/pdf");
    exportClipPdf(clip, ruleSet?.name ?? null);
  };

  if (error && !clip) return <p className="workspace-error">{error}</p>;
  if (!clip) return <p className="workspace-loading">Loading…</p>;

  return (
    <div className="workspace">
      <div className="workspace-head">
        <div>
          <a
            href="#/"
            className="workspace-back"
            onClick={(e) => {
              e.preventDefault();
              navigate("/");
            }}
          >
            ← Library
          </a>
          <h1>{clip.title}</h1>
          <div className="workspace-meta">
            <span>{clip.runtime}</span>
            {ruleSet && <span>{ruleSet.name}</span>}
            <span className={`tag tag-${clip.status}`}>{clip.status}</span>
          </div>
        </div>
        <div className="workspace-head-actions">
          <button className="btn btn-secondary" onClick={exportPdf}>
            Export PDF
          </button>
          <button className="btn btn-secondary" onClick={deleteClip}>
            Delete
          </button>
        </div>
      </div>

      {error && <p className="workspace-error">{error}</p>}

      <div className="workspace-tabs">
        <button className={tab === "concept" ? "active" : ""} onClick={() => setTab("concept")}>
          Concept
        </button>
        <button className={tab === "script" ? "active" : ""} onClick={() => setTab("script")}>
          Script &amp; Prompts
        </button>
      </div>

      {tab === "concept" && (
        <div className="concept-tab">
          <div className="chat-thread">
            {clip.concept_chat.length === 0 && (
              <p className="chat-empty">Bring me the idea — what's the clip about?</p>
            )}
            {clip.concept_chat.map((m, i) => (
              <div key={i} className={`chat-bubble chat-${m.role}`}>
                {m.content}
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>
          <div className="chat-input-row">
            <textarea
              placeholder="Type your idea or reply…"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage();
                }
              }}
              rows={2}
            />
            <button className="btn btn-primary" onClick={sendMessage} disabled={sending || !chatInput.trim()}>
              {sending ? "…" : "Send"}
            </button>
          </div>
          <div className="concept-tab-footer">
            <button
              className="btn btn-primary"
              onClick={generateScript}
              disabled={generating || clip.concept_chat.length === 0}
            >
              {generating ? "Writing…" : clip.script ? "Regenerate Script →" : "Generate Script →"}
            </button>
          </div>
        </div>
      )}

      {tab === "script" && (
        <div className="script-tab">
          <div className="script-tab-status">
            <button className={clip.status === "concept" ? "active" : ""} onClick={() => setStatus("concept")}>
              Concept
            </button>
            <button className={clip.status === "draft" ? "active" : ""} onClick={() => setStatus("draft")}>
              Draft
            </button>
            <button className={clip.status === "complete" ? "active" : ""} onClick={() => setStatus("complete")}>
              Complete
            </button>
          </div>

          <label className="script-tab-label">
            Script
            <textarea
              rows={14}
              value={scriptDraft}
              onChange={(e) => {
                setScriptDraft(e.target.value);
                setScriptDirty(true);
              }}
              placeholder="No script yet — go to Concept and generate one, or write it here yourself."
            />
          </label>

          <label className="script-tab-label">
            AI Video Prompts
            <textarea
              rows={10}
              value={promptsDraft}
              onChange={(e) => {
                setPromptsDraft(e.target.value);
                setScriptDirty(true);
              }}
              placeholder="No prompts yet."
            />
          </label>

          <div className="script-tab-actions">
            <button className="btn btn-primary" onClick={saveScript} disabled={savingScript || !scriptDirty}>
              {savingScript ? "Saving…" : scriptDirty ? "Save Changes" : "Saved"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
