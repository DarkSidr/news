<script lang="ts">
  import type { NewsItem } from '$lib/types';
  import { formatDistanceToNow } from 'date-fns';
  import { ExternalLink } from 'lucide-svelte';

  let { news } = $props<{ news: NewsItem }>();

  let timeAgo = $derived(formatDistanceToNow(new Date(news.pubDate), { addSuffix: true }));
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
      </a>
    </h3>

    <p class="text-sm text-gray-600 dark:text-gray-400 line-clamp-3">
      {news.contentSnippet}
    </p>

    <div class="mt-auto pt-2 flex items-center justify-end">
       <a href={news.link} target="_blank" rel="noopener noreferrer" class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors" aria-label="Open link">
          <ExternalLink size={16} />
       </a>
    </div>
  </div>
</article>
