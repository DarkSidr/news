<script lang="ts">
  import { onMount } from 'svelte';
  import { flip } from 'svelte/animate';
  import { fade, fly } from 'svelte/transition';
  import { cubicOut } from 'svelte/easing';
  import type { PageData } from './$types';
  import NewsCard from '$lib/components/NewsCard.svelte';
  import ThemeToggle from '$lib/components/ThemeToggle.svelte';
  import MasonryGrid from '$lib/components/MasonryGrid.svelte';
  import { LayoutGrid, ArrowDownNarrowWide, AlignJustify, LayoutTemplate } from 'lucide-svelte';

  let { data } = $props<{ data: PageData }>();
  let now = $state(new Date());
  let layout = $state<'masonry' | 'grid'>('grid'); // Default to grid (left-to-right) as requested
  let updatedLabel = $derived(now.toLocaleTimeString('ru-RU'));

  const itemListSchema = $derived({
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Лента технологических новостей',
    itemListElement: data.news.slice(0, 20).map((item: PageData['news'][number], index: number) => ({
      '@type': 'ListItem',
      position: index + 1,
      url: item.link,
      name: item.title
    }))
  });

  onMount(() => {
    now = new Date(data.generatedAt);

    const timer = setInterval(() => {
      now = new Date();
    }, 1000);

    return () => clearInterval(timer);
  });
</script>

<svelte:head>
  <title>TechNews | Агрегатор технологических новостей</title>
  <meta
    name="description"
    content="Интеллектуальный агрегатор новостей про разработку, ИИ и операционные системы в реальном времени."
  />
  <meta property="og:title" content="TechNews | Агрегатор технологических новостей" />
  <meta
    property="og:description"
    content="Свежая технологическая повестка из OpenNET, Habr, Hacker News, Phoronix и TechCrunch."
  />
  <meta property="og:type" content="website" />
  <meta name="robots" content="index,follow,max-image-preview:large" />
  <script type="application/ld+json">
    {JSON.stringify(itemListSchema)}
  </script>
</svelte:head>

<div class="min-h-screen bg-gray-50 dark:bg-gray-950 p-4 md:p-8 transition-colors duration-300">
  <div class="max-w-7xl mx-auto">
    <header class="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
      <div>
        <h1 class="text-4xl font-extrabold text-gray-900 dark:text-white tracking-tight">
          Tech<span class="text-blue-500">News</span>
        </h1>
        <p class="text-gray-500 dark:text-gray-400 mt-2 font-medium">
          Интеллектуальный агрегатор <span class="text-gray-300 dark:text-gray-600">|</span> Лента в реальном
          времени
        </p>
      </div>
      <div class="flex items-center gap-4">
        <div class="bg-white dark:bg-gray-800 rounded-lg p-1 flex items-center shadow-sm border border-gray-100 dark:border-gray-700">
           <button
            class="p-2 rounded-md transition-all {layout === 'grid' ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-300 shadow-sm' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50'}"
            onclick={() => layout = 'grid'}
            aria-label="Сетка (слева направо)"
            title="Сортировка слева направо"
          >
            <LayoutGrid size={20} />
          </button>
          <button
            class="p-2 rounded-md transition-all {layout === 'masonry' ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-300 shadow-sm' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50'}"
            onclick={() => layout = 'masonry'}
            aria-label="Колонки (сверху вниз)"
            title="Сортировка сверху вниз"
          >
             <LayoutTemplate size={20} class="rotate-90" />
          </button>
        </div>

        <div class="text-xs md:text-sm text-gray-400 dark:text-gray-500 font-mono hidden md:block" aria-live="polite">
          {updatedLabel}
        </div>
        <ThemeToggle />
      </div>
    </header>

    <main 
      id="main-content" 
      class="transition-all duration-500 ease-in-out {layout === 'masonry' ? 'columns-1 md:columns-2 lg:columns-3 gap-6 space-y-6' : 'w-full'}" 
      aria-label="Лента новостей"
    >
      {#if data.news.length === 0}
        <div class="col-span-full">
            <p class="text-center text-gray-500 dark:text-gray-400 py-12 bg-white/60 dark:bg-gray-900/60 rounded-xl">
            Новости временно недоступны. Попробуйте обновить страницу через несколько минут.
            </p>
        </div>
      {:else}
        {#if layout === 'grid'}
           <MasonryGrid items={data.news} />
        {:else}
           {#each data.news as item (item.id)}
             <div class="mb-6 break-inside-avoid" animate:flip={{ duration: 400, easing: cubicOut }} in:fade={{ duration: 300, delay: 100 }}>
                <NewsCard news={item} />
             </div>
           {/each}
        {/if}
      {/if}
    </main>
  </div>
</div>
