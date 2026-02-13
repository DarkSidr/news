<script lang="ts">
  import type { NewsItem } from '$lib/types';
  import { formatDistanceToNow } from 'date-fns';
  import { ru } from 'date-fns/locale';
  import { ExternalLink } from 'lucide-svelte';

  let { news } = $props<{ news: NewsItem }>();

  let timeAgo = $derived(
    formatDistanceToNow(new Date(news.pubDate), { addSuffix: true, locale: ru })
  );
</script>

<article class="break-inside-avoid mb-4 transition-all hover:-translate-y-1 hover:shadow-lg bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden flex flex-col h-auto backdrop-blur-sm dark:bg-opacity-80">
  <div class="p-5 flex flex-col gap-3">
    <div class="flex justify-between items-start">
      <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
        {news.source}
      </span>
      <span class="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap ml-2">
        {timeAgo}
      </span>
    </div>

    <h3 class="text-lg font-bold text-gray-900 dark:text-gray-100 leading-tight">
      <a href={news.link} target="_blank" rel="noopener noreferrer" class="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
        {news.title}
        <ExternalLink size={14} class="inline-block ml-1 opacity-70" aria-hidden="true" />
      </a>
    </h3>

    <div class="prose prose-sm dark:prose-invert max-w-none">
      <p class="text-sm text-gray-600 dark:text-gray-400 line-clamp-3">{news.contentSnippet}</p>
    </div>
  </div>
</article>
