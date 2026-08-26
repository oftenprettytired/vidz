// Supabase Edge Function: concept-chat
// One turn of the concept-brainstorming conversation for a clip. Loads the
// clip's rule set (genre cheat sheet) and existing chat history, sends the
// whole thing to Claude as a creative writing partner, appends both the
// user's message and Claude's reply to concept_chat, and returns the reply.

import { createClient } from "npm:@supabase/supabase-js@2";
import { checkAccessKey } from "../_shared/auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-vidz-key",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "content-type": "application/json" },
  });
}

function buildSystemPrompt(clipTitle: string, runtime: string, ruleName: string | null, rules: string | null) {
  return `You are a sharp, collaborative creative partner helping brainstorm the concept for a short AI-generated video clip before any script gets written.

Clip title (working): "${clipTitle}"
Target runtime: ${runtime}
${ruleName && rules ? `Genre: ${ruleName}\n\nHouse rules/cheat sheet for this genre — follow these closely, they define what "good" looks like for this creator:\n${rules}` : "No genre rules attached yet — just brainstorm freely."}

Your job right now is ONLY to discuss and sharpen the concept: the premise, the beat structure, the comedic engine or turn, casting/character ideas, the ending. Do NOT write a full script yet — that happens in a separate step later. Keep replies conversational, punchy, and short (a few sentences to a short paragraph, occasionally a quick list of options). Push back or offer sharper alternatives when the idea is generic. Ask a clarifying question when it would meaningfully change the direction, but don't stall on questions if you can just offer strong options instead.`;
}

async function callClaude(system: string, messages: ChatMessage[]): Promise<string> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": ANTHROPIC_API_KEY ?? "",
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-opus-5",
      max_tokens: 1024,
      system,
      messages,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Claude API error (${res.status}): ${errText}`);
  }

  const data = await res.json();
  const textBlock = data.content?.find((c: { type: string }) => c.type === "text");
  if (!textBlock?.text) throw new Error("Claude API returned no text content");
  return textBlock.text;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const authError = checkAccessKey(req, corsHeaders);
  if (authError) return authError;

  if (!ANTHROPIC_API_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return json({ error: "Server misconfigured: missing required env vars" }, 500);
  }

  let body: { clipId?: string; message?: string };
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }
  const clipId = body.clipId;
  const message = body.message?.trim();
  if (!clipId || !message) return json({ error: "clipId and message are required" }, 400);

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  const { data: clip, error: clipError } = await supabase
    .from("clips")
    .select("id, title, runtime, concept_chat, rule_set_id")
    .eq("id", clipId)
    .single();
  if (clipError || !clip) return json({ error: "Clip not found" }, 404);

  let ruleName: string | null = null;
  let rules: string | null = null;
  if (clip.rule_set_id) {
    const { data: ruleSet } = await supabase
      .from("rule_sets")
      .select("name, rules")
      .eq("id", clip.rule_set_id)
      .single();
    if (ruleSet) {
      ruleName = ruleSet.name;
      rules = ruleSet.rules;
    }
  }

  const history: ChatMessage[] = Array.isArray(clip.concept_chat) ? clip.concept_chat : [];
  const messages: ChatMessage[] = [...history, { role: "user", content: message }];

  let reply: string;
  try {
    reply = await callClaude(buildSystemPrompt(clip.title, clip.runtime, ruleName, rules), messages);
  } catch (err) {
    console.error("Claude call failed:", err);
    return json({ error: "Failed to get a response. Please try again." }, 502);
  }

  const updatedChat: ChatMessage[] = [...messages, { role: "assistant", content: reply }];

  const { error: updateError } = await supabase
    .from("clips")
    .update({ concept_chat: updatedChat, updated_at: new Date().toISOString() })
    .eq("id", clipId);
  if (updateError) console.error("Failed to save chat history:", updateError);

  return json({ reply, chat: updatedChat });
});
