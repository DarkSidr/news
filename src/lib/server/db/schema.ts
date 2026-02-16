import {
  pgTable,
  serial,
  varchar,
  text,
  timestamp,
  boolean,
  integer,
  index
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

/**
 * Источники новостей (RSS feeds, APIs)
 */
export const feedSources = pgTable('feed_sources', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 100 }).notNull(),
  url: text('url').notNull().unique(),
  type: varchar('type', { length: 20 }).default('rss').notNull(), // 'rss' | 'api' | 'arxiv'
  language: varchar('language', { length: 10 }).default('ru').notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  lastFetchedAt: timestamp('last_fetched_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull()
});

/**
 * Статьи/новости
 */
export const articles = pgTable(
  'articles',
  {
    // ID в формате SourceName:guid или SourceName:link (из buildNewsId)
    id: varchar('id', { length: 500 }).primaryKey(),
    sourceId: integer('source_id')
      .references(() => feedSources.id, { onDelete: 'cascade' })
      .notNull(),
    title: text('title').notNull(),
    link: text('link').notNull().unique(),
    pubDate: timestamp('pub_date', { withTimezone: true }).notNull(),
    content: text('content'),
    contentSnippet: varchar('content_snippet', { length: 500 }),
    imageUrl: text('image_url'),
    language: varchar('language', { length: 10 }).default('en').notNull(),
    // Поля для перевода (Stage 4)
    translatedTitle: text('translated_title'),
    translatedSnippet: text('translated_snippet'),
    translatedContent: text('translated_content'),
    isTranslated: boolean('is_translated').default(false).notNull(),
    // Поля для AI-суммаризации (Stage 7)
    summary: text('summary'),
    isSummarized: boolean('is_summarized').default(false).notNull(),
    summaryModel: varchar('summary_model', { length: 50 }),
    // Мета
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull()
  },
  (table) => ({
    articlesPubDateIdx: index('articles_pub_date_idx').on(table.pubDate),
    articlesLanguageTranslatedIdx: index('articles_language_is_translated_idx').on(
      table.language,
      table.isTranslated
    )
  })
);

/**
 * Логи фетчинга
 */
export const fetchLogs = pgTable('fetch_logs', {
  id: serial('id').primaryKey(),
  sourceId: integer('source_id').references(() => feedSources.id, { onDelete: 'cascade' }),
  fetchedAt: timestamp('fetched_at', { withTimezone: true }).defaultNow().notNull(),
  itemsCount: integer('items_count').default(0).notNull(),
  newItemsCount: integer('new_items_count').default(0).notNull(),
  error: text('error'),
  durationMs: integer('duration_ms')
});

/**
 * Relations (для JOIN-запросов)
 */
export const feedSourcesRelations = relations(feedSources, ({ many }) => ({
  articles: many(articles),
  fetchLogs: many(fetchLogs)
}));

export const articlesRelations = relations(articles, ({ one }) => ({
  source: one(feedSources, {
    fields: [articles.sourceId],
    references: [feedSources.id]
  })
}));

export const fetchLogsRelations = relations(fetchLogs, ({ one }) => ({
  source: one(feedSources, {
    fields: [fetchLogs.sourceId],
    references: [feedSources.id]
  })
}));

/**
 * Type inference
 */
export type FeedSource = typeof feedSources.$inferSelect;
export type NewFeedSource = typeof feedSources.$inferInsert;

export type Article = typeof articles.$inferSelect;
export type NewArticle = typeof articles.$inferInsert;

export type FetchLog = typeof fetchLogs.$inferSelect;
export type NewFetchLog = typeof fetchLogs.$inferInsert;
