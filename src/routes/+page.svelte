<script lang="ts">
  import type { PageData } from './$types';
  import NewsCard from '$lib/components/NewsCard.svelte';

  let { data } = $props<{ data: PageData }>();
</script>

<div class="min-h-screen bg-gray-50 dark:bg-gray-950 p-4 md:p-8 transition-colors duration-300">
  <div class="max-w-7xl mx-auto">
    <header class="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
      <div>
        <h1 class="text-4xl font-extrabold text-gray-900 dark:text-white tracking-tight">
          Tech<span class="text-blue-500">News</span>
        </h1>
        <p class="text-gray-500 dark:text-gray-400 mt-2 font-medium">
          Intelligent Aggregator <span class="text-gray-300 dark:text-gray-600">|</span> Real-time Stream
        </p>
      </div>
      <div class="text-sm text-gray-400 dark:text-gray-500">
        Updated: {new Date().toLocaleTimeString()}
      </div>
    </header>

    <main class="columns-1 md:columns-2 lg:columns-3 gap-6">
      {#each data.news as item (item.id)}
        <NewsCard news={item} />
      {/each}
    </main>
  </div>
</div>
