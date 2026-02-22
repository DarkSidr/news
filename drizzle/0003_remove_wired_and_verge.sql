-- Удаление источников Wired и The Verge и связанных данных
-- Миграция создана: 22.02.2026

-- Поиск ID источников Wired и The Verge
DO $$
DECLARE
  wired_id INTEGER;
  verge_id INTEGER;
BEGIN
  -- Получаем ID источников
  SELECT id INTO wired_id FROM feed_sources WHERE name ILIKE '%wired%' LIMIT 1;
  SELECT id INTO verge_id FROM feed_sources WHERE name ILIKE '%verge%' LIMIT 1;

  -- Логируем что будет удалено
  IF wired_id IS NOT NULL THEN
    RAISE NOTICE 'Удаление источника Wired (ID: %)', wired_id;
    RAISE NOTICE 'Статей от Wired: %', (SELECT COUNT(*) FROM articles WHERE source_id = wired_id);
    RAISE NOTICE 'Логов от Wired: %', (SELECT COUNT(*) FROM fetch_logs WHERE source_id = wired_id);
  ELSE
    RAISE NOTICE 'Источник Wired не найден в базе данных';
  END IF;

  IF verge_id IS NOT NULL THEN
    RAISE NOTICE 'Удаление источника The Verge (ID: %)', verge_id;
    RAISE NOTICE 'Статей от The Verge: %', (SELECT COUNT(*) FROM articles WHERE source_id = verge_id);
    RAISE NOTICE 'Логов от The Verge: %', (SELECT COUNT(*) FROM fetch_logs WHERE source_id = verge_id);
  ELSE
    RAISE NOTICE 'Источник The Verge не найден в базе данных';
  END IF;

  -- Удаляем источники (CASCADE удалит связанные статьи и логи автоматически)
  DELETE FROM feed_sources WHERE id IN (wired_id, verge_id);

  -- Итоговая статистика
  RAISE NOTICE 'Удаление завершено';
END $$;

-- Очистка записей из telegram_sent_articles для статей, которые уже не существуют
DELETE FROM telegram_sent_articles
WHERE article_id NOT IN (SELECT id FROM articles);
