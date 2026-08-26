create table rule_sets (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  rules text not null,
  created_at timestamptz not null default now()
);

-- No anon policies: this table is only ever read/written via service-role
-- edge functions (rule-sets), since Vidz is a single-user internal tool.
alter table rule_sets enable row level security;
