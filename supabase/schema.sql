-- Supabase schema for CabinMind persistent storage.
-- Run this once in the Supabase project's SQL editor (Database → SQL Editor).
-- Replaces the ephemeral /tmp JSON storage used by lib/usageStore.js and lib/tokenStore.js,
-- and backs the new ICP templates, referral, and lead-guarantee features.

create table if not exists usage_records (
  subscription_key text not null,
  month            text not null, -- 'YYYY-MM'
  zb_validations   integer not null default 0,
  lead_batches     integer not null default 0,
  updated_at       timestamptz not null default now(),
  primary key (subscription_key, month)
);

create table if not exists seen_leads (
  subscription_key text primary key,
  lead_ids         text[] not null default '{}',
  updated_at       timestamptz not null default now()
);

-- Owner-facing log of every lead run (see lib/runLog.js).
-- Business identifiers only: contact names and emails are never stored here.
create table if not exists lead_runs (
  id                    uuid primary key default gen_random_uuid(),
  at                    timestamptz not null default now(),
  source_kind           text,          -- trial | demo | customer
  source_label          text,          -- trial slug, or subscription key
  plan                  text,
  icp                   text,
  requested             integer,
  delivered             integer,
  provider              text,          -- google-places | groq | openai
  grades                jsonb,
  screened              jsonb,
  duration_ms           integer,
  hunter_quota_exceeded boolean not null default false,
  companies             jsonb
);
create index if not exists lead_runs_at_idx on lead_runs (at desc);
create index if not exists lead_runs_source_idx on lead_runs (source_label);

create table if not exists dashboard_tokens (
  token           text primary key,
  agent_id        text,
  customer_email  text,
  customer_name   text,
  session_id      text,
  brand_logo_url  text,
  brand_color     text,
  brand_company   text,
  white_label     boolean not null default false,
  created_at      timestamptz not null default now()
);

create table if not exists icp_templates (
  id                uuid primary key default gen_random_uuid(),
  subscription_key  text not null,
  name              text not null,
  icp               text not null,
  industry          text,
  location          text,
  company_size      text,
  exclude_companies text,
  created_at        timestamptz not null default now()
);
create index if not exists icp_templates_subscription_key_idx on icp_templates (subscription_key);

create table if not exists referrals (
  code              text primary key,
  subscription_key  text not null,
  referred_key      text,
  redeemed_at       timestamptz,
  created_at        timestamptz not null default now()
);

create table if not exists lead_guarantee_claims (
  id                uuid primary key default gen_random_uuid(),
  subscription_key  text not null,
  lead_id           text not null,
  reason            text,
  status            text not null default 'pending', -- pending | replaced | denied
  created_at        timestamptz not null default now()
);
