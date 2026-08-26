import { useEffect, useState, type ReactNode } from "react";
import { ruleSetsApi, UnauthorizedError } from "./lib/api";
import { getAccessKey, setAccessKey, clearAccessKey } from "./lib/auth";
import "./AccessGate.css";

type Status = "checking" | "locked" | "unlocked";

export default function AccessGate({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<Status>(getAccessKey() ? "checking" : "locked");
  const [input, setInput] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status !== "checking") return;
    ruleSetsApi
      .list()
      .then(() => setStatus("unlocked"))
      .catch((err) => {
        if (err instanceof UnauthorizedError) {
          clearAccessKey();
          setStatus("locked");
        } else {
          // Non-auth failure (network, server error) — don't block access on it.
          setStatus("unlocked");
        }
      });
  }, [status]);

  const submit = async () => {
    if (!input.trim()) return;
    setSubmitting(true);
    setError(null);
    setAccessKey(input.trim());
    try {
      await ruleSetsApi.list();
      setStatus("unlocked");
    } catch (err) {
      if (err instanceof UnauthorizedError) {
        clearAccessKey();
        setError("Wrong key. Try again.");
      } else {
        // Non-auth failure — let them through, the app's own pages will surface it.
        setStatus("unlocked");
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (status === "checking") return null;

  if (status === "locked") {
    return (
      <div className="access-gate">
        <div className="access-gate-card">
          <h1>Vidz</h1>
          <p>Enter the access key to continue.</p>
          <input
            type="password"
            autoFocus
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            placeholder="Access key"
          />
          {error && <p className="access-gate-error">{error}</p>}
          <button className="btn btn-primary" onClick={submit} disabled={submitting || !input.trim()}>
            {submitting ? "Checking…" : "Unlock"}
          </button>
        </div>
      </div>
    );
  }

  return children;
}
