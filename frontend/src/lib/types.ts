export interface RuleSet {
  id: string;
  name: string;
  rules: string;
  created_at: string;
}

export type ClipStatus = "concept" | "draft" | "complete";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface Clip {
  id: string;
  title: string;
  runtime: string;
  rule_set_id: string | null;
  status: ClipStatus;
  concept_chat: ChatMessage[];
  script: string | null;
  prompts: string | null;
  created_at: string;
  updated_at: string;
}
