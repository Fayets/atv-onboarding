-- Schema and tables for ATV onboarding (Neon PostgreSQL)

CREATE SCHEMA IF NOT EXISTS onboarding;

CREATE TABLE IF NOT EXISTS onboarding.sessions (
  id UUID PRIMARY KEY,
  client_name TEXT,
  client_email TEXT,
  plan TEXT,
  password_hash TEXT,
  used BOOLEAN DEFAULT FALSE,
  skool_used BOOLEAN DEFAULT FALSE,
  form_submitted BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP,
  expires_at TIMESTAMP,
  discord_channel_id TEXT,
  discord_invite_url TEXT,
  discord_invite_used BOOLEAN DEFAULT FALSE,
  form_submitted_at TIMESTAMP,
  call_scheduled_at TIMESTAMP,
  call_completed_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS onboarding.forms (
  id UUID PRIMARY KEY,
  session_id UUID REFERENCES onboarding.sessions(id),
  form_data JSONB,
  submitted_at TIMESTAMP
);
