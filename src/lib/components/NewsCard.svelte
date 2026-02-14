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

<article class="break-inside-avoid mb-6 transition-all hover:-translate-y-1 hover:shadow-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden flex flex-col h-auto backdrop-blur-sm dark:bg-opacity-80 group">
  <a href="/news/{encodeURIComponent(news.id)}" class="block overflow-hidden relative aspect-video">
    {#if news.imageUrl}
      <img
        src={news.imageUrl}
        alt={news.title}
        class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        loading="lazy"
      />
    {:else}
      <div class="w-full h-full bg-gradient-to-br from-blue-500/20 to-purple-500/20 dark:from-blue-900/40 dark:to-purple-900/40 flex items-center justify-center">
        <span class="text-4xl opacity-20 select-none">📰</span>
      </div>
    {/if}
    <div class="absolute top-3 left-3">
      <span class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-white/90 dark:bg-black/80 text-gray-800 dark:text-gray-200 backdrop-blur-md shadow-sm">
        {news.source}
      </span>
    </div>
  </a>

  <div class="p-5 flex flex-col gap-3">
    <div class="flex justify-between items-start text-xs text-gray-500 dark:text-gray-400">
      <span>{timeAgo}</span>
    </div>

    <h3 class="text-xl font-bold text-gray-900 dark:text-gray-100 leading-tight">
      <a href="/news/{encodeURIComponent(news.id)}" class="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
        {news.title}
      </a>
    </h3>

    <div class="prose prose-sm dark:prose-invert max-w-none">
      <p class="text-gray-600 dark:text-gray-400 line-clamp-3 leading-relaxed">
        {news.contentSnippet}
      </p>
    </div>
    
    <div class="mt-2 pt-4 border-t border-gray-100 dark:border-gray-800 flex justify-between items-center">
        <a href="/news/{encodeURIComponent(news.id)}" class="text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline">
            Читать далее
        </a>
        
        <a href={news.link} target="_blank" rel="noopener noreferrer" class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300" title="Открыть оригинал">
            <ExternalLink size={16} />
        </a>
    </div>
  </div>
</article>
