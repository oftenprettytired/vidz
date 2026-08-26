// Supabase Edge Function: rule-sets
// CRUD for genre rule sets (e.g. "Comedy" and its cheat sheet). Service-role
// only — Vidz is a single-user internal tool, no anon table access.

import { createClient } from "npm:@supabase/supabase-js@2";
import { checkAccessKey } from "../_shared/auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-vidz-key",
  "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "content-type": "application/json" },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const authError = checkAccessKey(req, corsHeaders);
  if (authError) return authError;

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return json({ error: "Server misconfigured: missing Supabase service role env" }, 500);
  }
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const url = new URL(req.url);

  if (req.method === "GET") {
    const { data, error } = await supabase
      .from("rule_sets")
      .select("*")
      .order("created_at", { ascending: true });
    if (error) return json({ error: error.message }, 500);
    return json({ ruleSets: data });
  }

  if (req.method === "POST") {
    let body: { name?: string; rules?: string };
    try {
      body = await req.json();
    } catch {
      return json({ error: "Invalid JSON body" }, 400);
    }
    const name = body.name?.trim();
    const rules = body.rules?.trim();
    if (!name || !rules) return json({ error: "name and rules are required" }, 400);

    const { data, error } = await supabase
      .from("rule_sets")
      .insert({ name, rules })
      .select()
      .single();
    if (error) return json({ error: error.message }, 500);
    return json({ ruleSet: data }, 201);
  }

  if (req.method === "PATCH") {
    const id = url.searchParams.get("id");
    if (!id) return json({ error: "Missing id query param" }, 400);
    let body: { name?: string; rules?: string };
    try {
      body = await req.json();
    } catch {
      return json({ error: "Invalid JSON body" }, 400);
    }
    const updates: Record<string, string> = {};
    if (body.name?.trim()) updates.name = body.name.trim();
    if (body.rules?.trim()) updates.rules = body.rules.trim();
    if (Object.keys(updates).length === 0) return json({ error: "Nothing to update" }, 400);

    const { data, error } = await supabase
      .from("rule_sets")
      .update(updates)
      .eq("id", id)
      .select()
      .single();
    if (error) return json({ error: error.message }, 500);
    return json({ ruleSet: data });
  }

  if (req.method === "DELETE") {
    const id = url.searchParams.get("id");
    if (!id) return json({ error: "Missing id query param" }, 400);
    const { error } = await supabase.from("rule_sets").delete().eq("id", id);
    if (error) return json({ error: error.message }, 500);
    return json({ ok: true });
  }

  return json({ error: "Method not allowed" }, 405);
});
