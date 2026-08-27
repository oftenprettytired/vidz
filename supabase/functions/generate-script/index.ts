// Supabase Edge Function: generate-script
// Takes everything discussed in a clip's concept chat plus its genre rules
// and asks Claude for a finished script draft AND a separate set of
// AI-video-gen prompts (per shot/scene), then saves both to the clip.

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

function buildPrompt(
  title: string,
  runtime: string,
  ruleName: string | null,
  rules: string | null,
  chat: ChatMessage[],
) {
  const transcript = chat.map((m) => `${m.role === "user" ? "Creator" : "You"}: ${m.content}`).join("\n\n");

  return `You are a sharp comedy/short-form video writer. Below is a brainstorming conversation you just had with a creator about a short AI-generated video clip. The concept is now settled. Your job is to turn it into a finished deliverable.

Clip title: "${title}"
Target runtime: ${runtime}
${ruleName && rules ? `Genre: ${ruleName}\n\nHouse rules/cheat sheet for this genre — the script MUST follow these:\n${rules}\n` : ""}
Brainstorming conversation:
${transcript}

Produce exactly two sections, in this order, each starting with the exact header on its own line:

SCRIPT
A tight, shootable script for the clip that fits the target runtime — dialogue/action lines, minimal scene direction, ready for someone to read and perform or feed to an AI video generator's script-following mode.

PROMPTS
A numbered list of AI-video-generation prompts, one per shot/scene, in the order they'd be generated. Each prompt should be a self-contained visual description (setting, characters, action, camera framing, tone) detailed enough to paste directly into an AI video generation tool — don't assume the tool has any other context.

Do not include anything before "SCRIPT" or after the last prompt. Do not add commentary about your choices.`;
}

async function callClaude(prompt: string): Promise<string> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": ANTHROPIC_API_KEY ?? "",
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-opus-5",
      max_tokens: 8192,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Claude API error (${res.status}): ${errText}`);
  }

  const data = await res.json();
  if (data.stop_reason === "max_tokens") {
    throw new Error("Response was cut off (hit max_tokens)");
  }
  const textBlock = data.content?.find((c: { type: string }) => c.type === "text");
  if (!textBlock?.text) throw new Error("Claude API returned no text content");
  return textBlock.text;
}

function splitScriptAndPrompts(raw: string): { script: string; prompts: string } {
  const scriptIdx = raw.indexOf("SCRIPT");
  const promptsIdx = raw.indexOf("PROMPTS");
  if (scriptIdx === -1 || promptsIdx === -1 || promptsIdx < scriptIdx) {
    return { script: raw.trim(), prompts: "" };
  }
  const script = raw.slice(scriptIdx + "SCRIPT".length, promptsIdx).trim();
  const prompts = raw.slice(promptsIdx + "PROMPTS".length).trim();
  return { script, prompts };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const authError = checkAccessKey(req, corsHeaders);
  if (authError) return authError;

  if (!ANTHROPIC_API_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return json({ error: "Server misconfigured: missing required env vars" }, 500);
  }

  let body: { clipId?: string };
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }
  const clipId = body.clipId;
  if (!clipId) return json({ error: "clipId is required" }, 400);

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  const { data: clip, error: clipError } = await supabase
    .from("clips")
    .select("id, title, runtime, concept_chat, rule_set_id, status")
    .eq("id", clipId)
    .single();
  if (clipError || !clip) return json({ error: "Clip not found" }, 404);

  const chat: ChatMessage[] = Array.isArray(clip.concept_chat) ? clip.concept_chat : [];
  if (chat.length === 0) {
    return json({ error: "No concept discussion yet — brainstorm the idea first" }, 400);
  }

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

  let script: string;
  let prompts: string;
  try {
    const raw = await callClaude(buildPrompt(clip.title, clip.runtime, ruleName, rules, chat));
    ({ script, prompts } = splitScriptAndPrompts(raw));
  } catch (err) {
    console.error("Claude call failed:", err);
    const message =
      err instanceof Error && err.message.includes("max_tokens")
        ? "The script ran too long to finish generating. Try a shorter runtime, or trim the concept discussion."
        : "Failed to generate script. Please try again.";
    return json({ error: message }, 502);
  }

  const { data: updated, error: updateError } = await supabase
    .from("clips")
    .update({
      script,
      prompts,
      status: clip.status === "concept" ? "draft" : clip.status,
      updated_at: new Date().toISOString(),
    })
    .eq("id", clipId)
    .select()
    .single();
  if (updateError) return json({ error: updateError.message }, 500);

  return json({ clip: updated });
});
