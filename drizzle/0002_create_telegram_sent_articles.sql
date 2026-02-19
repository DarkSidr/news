CREATE TABLE IF NOT EXISTS "telegram_sent_articles" (
  "article_id" text PRIMARY KEY NOT NULL,
  "sent_at" timestamp with time zone DEFAULT now() NOT NULL
);
