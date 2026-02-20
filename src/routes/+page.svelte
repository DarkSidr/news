<script lang="ts">
  import type { PageData } from './$types';
  import type { NewsItem, SourceWithCount } from '$lib/types';
  import ThemeToggle from '$lib/components/ThemeToggle.svelte';
  import MasonryGrid from '$lib/components/MasonryGrid.svelte';
  import ScrollToTop from '$lib/components/ScrollToTop.svelte';

  let { data } = $props<{ data: PageData }>();
  let now = $state(new Date());
  let updatedLabel = $derived(now.toLocaleTimeString('ru-RU'));
  let isLoaded = $state(false);
  let selectedSource = $state('Все источники');
  let isSourceMenuOpen = $state(false);
  let sourceMenuRoot: HTMLDivElement | null = null;

  // Пагинация
  let initialized = $state(false);
  let items = $state<NewsItem[]>([]);
  let hasMore = $state(false);
  let isLoadingMore = $state(false);
  let total = $state(0);

  // Инициализация из серверных данных только один раз
  $effect(() => {
    if (!initialized) {
      items = data.news;
      hasMore = data.hasMore;
      total = data.total ?? 0;
      initialized = true;
    }
  });

  async function loadMore() {
    if (isLoadingMore || !hasMore) return;
    isLoadingMore = true;
    try {
      const sourceQuery = selectedSource !== 'Все источники' ? `&source=${encodeURIComponent(selectedSource)}` : '';
      const res = await fetch(`/api/news?offset=${items.length}&limit=30${sourceQuery}`);
      if (!res.ok) return;
      const body = (await res.json()) as { items: NewsItem[]; hasMore: boolean; total: number };
      const existingIds = new Set(items.map((i) => i.id));
      items = [...items, ...body.items.filter((i) => !existingIds.has(i.id))];
      hasMore = body.hasMore;
      if (body.total) total = body.total;
    } finally {
      isLoadingMore = false;
    }
  }

  async function changeSource(sourceName: string) {
    if (selectedSource === sourceName) return;
    selectedSource = sourceName;
    isSourceMenuOpen = false;
    
    try {
      const sourceQuery = selectedSource !== 'Все источники' ? `&source=${encodeURIComponent(selectedSource)}` : '';
      const res = await fetch(`/api/news?offset=0&limit=30${sourceQuery}`);
      if (!res.ok) return;
      const body = (await res.json()) as { items: NewsItem[]; hasMore: boolean; total: number };
      items = body.items;
      hasMore = body.hasMore;
      total = body.total;
    } catch (e) {
      console.error(e);
    }
  }

  const totalNewsCount = $derived(data.sources.reduce((sum: number, s: SourceWithCount) => sum + s.count, 0));
  const uniqueSources = $derived.by<SourceWithCount[]>(() => {
    return [{ name: 'Все источники', count: totalNewsCount }, ...data.sources];
  });

  const selectedSourceMeta = $derived(`${total > 0 ? total : items.length} новостей`);

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

  $effect(() => {
    // Prevent layout shift: wait for hydration
    isLoaded = true;
    now = new Date(data.generatedAt);

    const timer = setInterval(() => {
      now = new Date();
    }, 1000);

    const handleDocumentPointerDown = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Node) || !sourceMenuRoot) {
        return;
      }

      if (!sourceMenuRoot.contains(target)) {
        isSourceMenuOpen = false;
      }
    };

    const handleDocumentKeydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        isSourceMenuOpen = false;
      }
    };

    document.addEventListener('mousedown', handleDocumentPointerDown);
    document.addEventListener('keydown', handleDocumentKeydown);

    return () => {
      clearInterval(timer);
      document.removeEventListener('mousedown', handleDocumentPointerDown);
      document.removeEventListener('keydown', handleDocumentKeydown);
    };
  });
</script>

<svelte:head>
  <title>Daily Dev News | Агрегатор технологических новостей</title>
  <link rel="canonical" href={data.canonicalUrl} />
  <meta
    name="description"
    content="Интеллектуальный агрегатор новостей про разработку, ИИ и операционные системы в реальном времени."
  />
  <meta property="og:title" content="Daily Dev News | Агрегатор технологических новостей" />
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
          Daily Dev <span class="text-blue-500">News</span>
        </h1>
        <p class="text-gray-500 dark:text-gray-400 mt-2 font-medium">
          Интеллектуальный агрегатор <span class="text-gray-300 dark:text-gray-600">|</span> Лента в реальном
          времени test
        </p>
      </div>

      <div class="w-full md:w-auto flex flex-col sm:flex-row items-stretch md:items-center gap-4">
        <!-- Source Filter -->
        <div class="w-full md:w-auto" bind:this={sourceMenuRoot}>
          <span id="source-filter-label" class="sr-only">Фильтр источников</span>
          <div class="relative">
            <button
              type="button"
              class="w-full md:min-w-[320px] rounded-2xl border border-slate-200/90 dark:border-slate-700/80 bg-white/95 dark:bg-slate-900/90 px-4 py-2.5 text-left shadow-[0_8px_24px_-14px_rgba(37,99,235,0.5)] transition-all duration-200 hover:border-blue-400/70 dark:hover:border-blue-500/70 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
              aria-haspopup="listbox"
              aria-labelledby="source-filter-label"
              aria-expanded={isSourceMenuOpen}
              onclick={() => {
                isSourceMenuOpen = !isSourceMenuOpen;
              }}
            >
              <span class="flex items-center justify-between gap-4">
                <span class="min-w-0">
                  <span class="block text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Источник
                  </span>
                  <span class="mt-0.5 block truncate text-sm md:text-base font-semibold text-slate-900 dark:text-slate-100">
                    {selectedSource}
                  </span>
                </span>
                <span class="flex shrink-0 items-center gap-3">
                  <span class="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-500/15 dark:text-blue-300">
                    {selectedSourceMeta}
                  </span>
                  <svg
                    class="h-4 w-4 text-slate-500 transition-transform duration-200 {isSourceMenuOpen ? 'rotate-180' : ''}"
                    viewBox="0 0 20 20"
                    fill="none"
                    aria-hidden="true"
                  >
                    <path
                      d="M6 8l4 4 4-4"
                      stroke="currentColor"
                      stroke-width="1.8"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    />
                  </svg>
                </span>
              </span>
            </button>

            {#if isSourceMenuOpen}
              <div
                class="absolute z-40 mt-2 w-full overflow-hidden rounded-2xl border border-slate-200/90 dark:border-slate-700/80 bg-white/95 dark:bg-slate-900/95 shadow-2xl backdrop-blur-md"
              >
                <ul
                  class="source-menu-scroll max-h-72 overflow-y-auto py-1"
                  role="listbox"
                  aria-labelledby="source-filter-label"
                >
                  {#each uniqueSources as source}
                    <li role="option" aria-selected={selectedSource === source.name}>
                      <button
                        type="button"
                        class="flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left text-sm md:text-base transition-colors duration-150 {selectedSource === source.name
                          ? 'bg-blue-600 text-white'
                          : 'text-slate-800 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800/80'}"
                        onclick={() => changeSource(source.name)}
                      >
                        <span class="truncate">
                          {source.name}
                        </span>
                        {#if selectedSource === source.name}
                          <svg
                            class="h-4 w-4 shrink-0"
                            viewBox="0 0 20 20"
                            fill="none"
                            aria-hidden="true"
                          >
                            <path
                              d="M5 10l3 3 7-7"
                              stroke="currentColor"
                              stroke-width="1.8"
                              stroke-linecap="round"
                              stroke-linejoin="round"
                            />
                          </svg>
                        {/if}
                      </button>
                    </li>
                  {/each}
                </ul>
              </div>
            {/if}
          </div>
        </div>

        <div class="flex items-center justify-between sm:justify-end gap-4">
          <a
            href="https://t.me/daily_dev_news"
            target="_blank"
            rel="noopener noreferrer"
            class="flex items-center gap-2 text-sm font-medium text-blue-500 dark:text-blue-400 hover:text-blue-600 dark:hover:text-blue-300 transition-colors"
            aria-label="Наш Telegram канал"
          >
            <svg class="h-6 w-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.415-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.892-.662 3.493-1.524 5.83-2.529 7.01-3.023 3.332-1.386 4.025-1.627 4.476-1.635z"/>
            </svg>
            <span class="hidden sm:inline">Telegram</span>
          </a>
          <div class="text-xs md:text-sm text-gray-400 dark:text-gray-500 font-mono hidden md:block" aria-live="polite">
            {updatedLabel}
          </div>
          <ThemeToggle />
        </div>
      </div>
    </header>

    <main
      id="main-content"
      class="w-full transition-opacity duration-500 {isLoaded ? 'opacity-100' : 'opacity-0'}"
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
        <MasonryGrid
          {items}
          {hasMore}
          {isLoadingMore}
          onLoadMore={loadMore}
        />
      {/if}
    </main>

    <footer class="mt-16 border-t border-slate-200/60 dark:border-slate-800/60 pt-6 pb-8 text-center">
      <p class="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
        © {new Date().getFullYear()} Daily Dev News.
        <span class="block sm:inline mt-1 sm:mt-0 sm:ml-2">
          Заголовки иностранных статей переведены автоматически.
        </span>
      </p>
    </footer>
  </div>
</div>

<ScrollToTop />

<style>
  .source-menu-scroll {
    scrollbar-width: thin;
    scrollbar-color: rgb(71 85 105 / 0.9) rgb(15 23 42 / 0.35);
  }

  .source-menu-scroll::-webkit-scrollbar {
    width: 10px;
  }

  .source-menu-scroll::-webkit-scrollbar-track {
    background: rgb(15 23 42 / 0.3);
    border-left: 1px solid rgb(51 65 85 / 0.45);
  }

  .source-menu-scroll::-webkit-scrollbar-thumb {
    background: linear-gradient(180deg, rgb(71 85 105 / 0.95), rgb(51 65 85 / 0.95));
    border-radius: 9999px;
    border: 2px solid rgb(15 23 42 / 0.3);
  }

  .source-menu-scroll::-webkit-scrollbar-thumb:hover {
    background: linear-gradient(180deg, rgb(100 116 139), rgb(71 85 105));
  }
</style>
