-- Run this entire script in your Supabase SQL Editor:
-- https://supabase.com/dashboard/project/hdbpzkzksbqptkfbeqwb/sql

-- 1. Chat Sessions
CREATE TABLE IF NOT EXISTS public.chat_sessions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     TEXT NOT NULL,
  title       TEXT NOT NULL DEFAULT 'New Chat',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Messages
CREATE TABLE IF NOT EXISTS public.messages (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id   UUID NOT NULL REFERENCES public.chat_sessions(id) ON DELETE CASCADE,
  sender       TEXT NOT NULL CHECK (sender IN ('user','assistant')),
  text_content TEXT NOT NULL DEFAULT '',
  media_url    TEXT,
  citations    JSONB DEFAULT '[]',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Documents
CREATE TABLE IF NOT EXISTS public.documents (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     TEXT NOT NULL,
  name        TEXT NOT NULL,
  chunk_count INTEGER NOT NULL DEFAULT 0,
  file_path   TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Indexes
CREATE INDEX IF NOT EXISTS idx_chat_sessions_user_id ON public.chat_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_session_id   ON public.messages(session_id);
CREATE INDEX IF NOT EXISTS idx_documents_user_id     ON public.documents(user_id);
