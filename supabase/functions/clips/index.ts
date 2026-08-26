// Supabase Edge Function: clips
// CRUD for video clip projects (title, runtime, rule set, status, script,
// prompts). Service-role only, same single-user pattern as rule-sets.

import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

const STATUSES = ["concept", "draft", "complete"];

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "content-type": "application/json" },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return json({ error: "Server misconfigured: missing Supabase service role env" }, 500);
  }
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const url = new URL(req.url);
  const id = url.searchParams.get("id");

  if (req.method === "GET") {
    if (id) {
      const { data, error } = await supabase.from("clips").select("*").eq("id", id).single();
      if (error) return json({ error: error.message }, 404);
      return json({ clip: data });
    }
    const { data, error } = await supabase
      .from("clips")
      .select("*")
      .order("updated_at", { ascending: false });
    if (error) return json({ error: error.message }, 500);
    return json({ clips: data });
  }

  if (req.method === "POST") {
    let body: { title?: string; runtime?: string; ruleSetId?: string };
    try {
      body = await req.json();
    } catch {
      return json({ error: "Invalid JSON body" }, 400);
    }
    const title = body.title?.trim();
    const runtime = body.runtime?.trim();
    if (!title || !runtime) return json({ error: "title and runtime are required" }, 400);

    const { data, error } = await supabase
      .from("clips")
      .insert({ title, runtime, rule_set_id: body.ruleSetId ?? null })
      .select()
      .single();
    if (error) return json({ error: error.message }, 500);
    return json({ clip: data }, 201);
  }

  if (req.method === "PATCH") {
    if (!id) return json({ error: "Missing id query param" }, 400);
    let body: {
      title?: string;
      runtime?: string;
      ruleSetId?: string;
      status?: string;
      script?: string;
      prompts?: string;
    };
    try {
      body = await req.json();
    } catch {
      return json({ error: "Invalid JSON body" }, 400);
    }
    const updates: Record<string, unknown> = {};
    if (body.title?.trim()) updates.title = body.title.trim();
    if (body.runtime?.trim()) updates.runtime = body.runtime.trim();
    if (body.ruleSetId !== undefined) updates.rule_set_id = body.ruleSetId;
    if (body.status) {
      if (!STATUSES.includes(body.status)) return json({ error: "Invalid status" }, 400);
      updates.status = body.status;
    }
    if (body.script !== undefined) updates.script = body.script;
    if (body.prompts !== undefined) updates.prompts = body.prompts;
    if (Object.keys(updates).length === 0) return json({ error: "Nothing to update" }, 400);
    updates.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from("clips")
      .update(updates)
      .eq("id", id)
      .select()
      .single();
    if (error) return json({ error: error.message }, 500);
    return json({ clip: data });
  }

  if (req.method === "DELETE") {
    if (!id) return json({ error: "Missing id query param" }, 400);
    const { error } = await supabase.from("clips").delete().eq("id", id);
    if (error) return json({ error: error.message }, 500);
    return json({ ok: true });
  }

  return json({ error: "Method not allowed" }, 405);
});
