<script lang="ts">
import type { NewsItem } from '$lib/types';
import NewsCard from '$lib/components/NewsCard.svelte';
import { fade } from 'svelte/transition';

  let { items, hasMore = false, isLoadingMore = false, onLoadMore, now = new Date() } = $props<{
    items: NewsItem[];
    hasMore?: boolean;
    isLoadingMore?: boolean;
    onLoadMore?: () => void;
    now?: Date;
  }>();

  let innerWidth = $state(0);
  let numCols = $state(1);
  let sentinel: HTMLDivElement | null = null;

  $effect(() => {
    if (innerWidth >= 1024) numCols = 3;
    else if (innerWidth >= 768) numCols = 2;
    else numCols = 1;
  });

  // Запуск loadMore при появлении sentinel в viewport.
  // Читаем isLoadingMore и hasMore синхронно — это создаёт реактивную зависимость,
  // поэтому observer пересоздаётся только когда они меняются.
  // Пока идёт загрузка (isLoadingMore=true) или нечего грузить (hasMore=false) — observer не создаётся.
  $effect(() => {
    if (!sentinel || !onLoadMore || isLoadingMore || !hasMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          onLoadMore();
        }
      },
      { rootMargin: '600px' }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  });

  // Инкрементальное распределение по колонкам:
  // при добавлении новых items существующие карточки не трогаются — только новые добавляются
  // в самую короткую колонку. При изменении numCols — полный пересчёт.
  let columns = $state<NewsItem[][]>([]);
  let colHeights: number[] = [];
  let knownItemsLen = 0;
  let knownNumCols = 0;
  let knownFirstId = '';

  function estimateHeight(item: NewsItem): number {
    return (item.title.length * 1.5) + (item.contentSnippet?.length ?? 0) + 100;
  }

  function appendItems(newItems: NewsItem[]) {
    const cols = columns.map((col) => [...col]);
    for (const item of newItems) {
      let minIdx = 0;
      for (let i = 1; i < cols.length; i++) {
        if (colHeights[i] < colHeights[minIdx]) minIdx = i;
      }
      cols[minIdx].push(item);
      colHeights[minIdx] += estimateHeight(item);
    }
    columns = cols;
  }

  function rebuildAll(allItems: NewsItem[], n: number) {
    const cols: NewsItem[][] = Array.from({ length: n }, () => []);
    colHeights = new Array(n).fill(0);
    for (const item of allItems) {
      let minIdx = 0;
      for (let i = 1; i < n; i++) {
        if (colHeights[i] < colHeights[minIdx]) minIdx = i;
      }
      cols[minIdx].push(item);
      colHeights[minIdx] += estimateHeight(item);
    }
    columns = cols;
  }

  $effect(() => {
    const n = numCols;
    const len = items.length;
    const snapshot = items;
    const firstId = snapshot[0]?.id ?? '';

    // Проверяем изменение содержимого по первому элементу
    const contentChanged = firstId !== knownFirstId && firstId !== '';

    if (n !== knownNumCols) {
      // Число колонок изменилось — пересчитываем всё
      rebuildAll(snapshot, n);
      knownNumCols = n;
      knownItemsLen = len;
      knownFirstId = firstId;
    } else if (len < knownItemsLen || len === 0 || contentChanged) {
      // items сбросились (новый фильтр / смена данных) — пересчитываем всё
      rebuildAll(snapshot, n);
      knownItemsLen = len;
      knownFirstId = firstId;
    } else if (len > knownItemsLen) {
      // Подгрузились новые items — добавляем только их, не трогая существующие
      appendItems(snapshot.slice(knownItemsLen));
      knownItemsLen = len;
      knownFirstId = firstId;
    }
  });
</script>

<svelte:window bind:innerWidth />

<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-start">
  {#each columns as column, i (i)}
    <div class="flex flex-col gap-6">
        {#each column as item (item.id)}
            <div in:fade={{ duration: 300 }}>
                <NewsCard news={item} {now} />
            </div>
        {/each}
    </div>
  {/each}
</div>

<!-- Sentinel для IntersectionObserver -->
<div bind:this={sentinel} class="h-px" aria-hidden="true"></div>

{#if isLoadingMore}
  <div class="flex justify-center py-8">
    <div class="h-6 w-6 animate-spin rounded-full border-2 border-blue-500 border-t-transparent"></div>
  </div>
{/if}

{#if !hasMore && items.length > 0}
  <p class="py-8 text-center text-sm text-gray-400 dark:text-gray-600">Все новости загружены</p>
{/if}
