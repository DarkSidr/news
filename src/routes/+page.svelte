<script lang="ts">
  import { onMount } from 'svelte';
  import type { PageData } from './$types';
  import ThemeToggle from '$lib/components/ThemeToggle.svelte';
  import MasonryGrid from '$lib/components/MasonryGrid.svelte';

  let { data } = $props<{ data: PageData }>();
  let now = $state(new Date());
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
  <link rel="canonical" href={data.canonicalUrl} />
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
        <div class="text-xs md:text-sm text-gray-400 dark:text-gray-500 font-mono hidden md:block" aria-live="polite">
          {updatedLabel}
        </div>
        <ThemeToggle />
      </div>
    </header>

    <main
      id="main-content"
      class="w-full"
      aria-label="Лента новостей"
    >
      {#if data.isFallback}
        <div class="col-span-full mb-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-200 rounded-lg border border-yellow-200 dark:border-yellow-700 text-center text-sm">
          ⚠️ База данных временно недоступна. Показана резервная лента (RSS).
        </div>
      {/if}
      {#if data.news.length === 0}
        <div class="col-span-full">
            <p class="text-center text-gray-500 dark:text-gray-400 py-12 bg-white/60 dark:bg-gray-900/60 rounded-xl">
            Новости временно недоступны. Попробуйте обновить страницу через несколько минут.
            </p>
        </div>
      {:else}
        <MasonryGrid items={data.news} />
      {/if}
    </main>
  </div>
</div>
