import { functionsUrl, anonKey } from "./supabase";
import type { Clip, ChatMessage, RuleSet } from "./types";

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${functionsUrl}/${path}`, {
    ...init,
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${anonKey}`,
      apikey: anonKey,
      ...init?.headers,
    },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? `Request failed (${res.status})`);
  return data as T;
}

export const ruleSetsApi = {
  list: () => call<{ ruleSets: RuleSet[] }>("rule-sets").then((d) => d.ruleSets),
  create: (name: string, rules: string) =>
    call<{ ruleSet: RuleSet }>("rule-sets", { method: "POST", body: JSON.stringify({ name, rules }) }).then(
      (d) => d.ruleSet,
    ),
  update: (id: string, updates: { name?: string; rules?: string }) =>
    call<{ ruleSet: RuleSet }>(`rule-sets?id=${id}`, { method: "PATCH", body: JSON.stringify(updates) }).then(
      (d) => d.ruleSet,
    ),
  remove: (id: string) => call<{ ok: true }>(`rule-sets?id=${id}`, { method: "DELETE" }),
};

export const clipsApi = {
  list: () => call<{ clips: Clip[] }>("clips").then((d) => d.clips),
  get: (id: string) => call<{ clip: Clip }>(`clips?id=${id}`).then((d) => d.clip),
  create: (title: string, runtime: string, ruleSetId: string | null) =>
    call<{ clip: Clip }>("clips", { method: "POST", body: JSON.stringify({ title, runtime, ruleSetId }) }).then(
      (d) => d.clip,
    ),
  update: (
    id: string,
    updates: Partial<{
      title: string;
      runtime: string;
      ruleSetId: string | null;
      status: string;
      script: string;
      prompts: string;
    }>,
  ) => call<{ clip: Clip }>(`clips?id=${id}`, { method: "PATCH", body: JSON.stringify(updates) }).then((d) => d.clip),
  remove: (id: string) => call<{ ok: true }>(`clips?id=${id}`, { method: "DELETE" }),
};

export const aiApi = {
  conceptChat: (clipId: string, message: string) =>
    call<{ reply: string; chat: ChatMessage[] }>("concept-chat", {
      method: "POST",
      body: JSON.stringify({ clipId, message }),
    }),
  generateScript: (clipId: string) =>
    call<{ clip: Clip }>("generate-script", { method: "POST", body: JSON.stringify({ clipId }) }).then(
      (d) => d.clip,
    ),
};
