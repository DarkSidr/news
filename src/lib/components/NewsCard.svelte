<script lang="ts">
  import type { NewsItem } from '$lib/types';
  import { formatDistance } from 'date-fns';
  import { ru } from 'date-fns/locale';
  import { ExternalLink } from 'lucide-svelte';

  let { news, now } = $props<{ news: NewsItem; now: Date }>();

  let timeAgo = $derived(
    formatDistance(new Date(news.pubDate), now, { addSuffix: true, locale: ru })
  );
  let languageFlag = $derived(news.isTranslated ? '🇬🇧→🇷🇺' : news.language === 'ru' ? '🇷🇺' : '🇬🇧');
  let languageLabel = $derived(news.isTranslated ? 'Доступен перевод' : 'Оригинал');
</script>

<article class="break-inside-avoid mb-4 transition-all hover:-translate-y-1 hover:shadow-lg bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden flex flex-col h-auto group cursor-pointer relative">
  <a href={news.link} target="_blank" rel="noopener noreferrer" class="block p-5 h-full">
    <div class="flex justify-between items-start mb-3">
      <span class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200">
        {news.source}
      </span>
      <div class="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
        <span>{timeAgo}</span>
        {#if news.isTranslated}
           <span title={languageLabel}>{languageFlag}</span>
        {/if}
      </div>
    </div>

    <h3 class="text-lg font-bold text-gray-900 dark:text-gray-100 leading-snug mb-3 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
      {news.title}
    </h3>

    <div class="prose prose-sm dark:prose-invert max-w-none mb-4">
      <p class="text-gray-600 dark:text-gray-400 line-clamp-4 text-sm leading-relaxed">
        {news.contentSnippet}
      </p>
    </div>

    <div class="flex items-center text-blue-600 dark:text-blue-400 text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity absolute bottom-5 right-5">
      <span>Читать оригинал</span>
      <ExternalLink size={14} class="ml-1" />
    </div>
  </a>
</article>
