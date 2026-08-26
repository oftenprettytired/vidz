create table clips (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  runtime text not null,
  rule_set_id uuid references rule_sets(id),
  status text not null default 'concept' check (status in ('concept', 'draft', 'complete')),
  concept_chat jsonb not null default '[]'::jsonb,
  script text,
  prompts text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- No anon policies: service-role edge functions only (clips, concept-chat,
-- generate-script). Same single-user pattern as rule_sets.
alter table clips enable row level security;
