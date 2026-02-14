<script lang="ts">
  import type { NewsItem } from '$lib/types';
  import NewsCard from '$lib/components/NewsCard.svelte';
  import { flip } from 'svelte/animate';
  import { fade } from 'svelte/transition';
  import { cubicOut } from 'svelte/easing';

  let { items } = $props<{ items: NewsItem[] }>();

  let innerWidth = $state(0);
  let numCols = $state(1);

  $effect(() => {
    if (innerWidth >= 1024) numCols = 3;
    else if (innerWidth >= 768) numCols = 2;
    else numCols = 1;
  });

  // Distribute items into columns to preserve LTR order but stack vertically
  // Col 0: 0, 3, 6
  // Col 1: 1, 4, 7
  // Col 2: 2, 5, 8
  const columns = $derived.by(() => {
    const cols: NewsItem[][] = Array.from({ length: numCols }, () => []);
    items.forEach((item: NewsItem, i: number) => {
        cols[i % numCols].push(item);
    });
    return cols;
  });
</script>

<svelte:window bind:innerWidth />

<div class="flex flex-col md:flex-row gap-6 items-start">
  {#each columns as column, i (i)}
    <div class="flex flex-col gap-6 flex-1 w-full relative">
        {#each column as item (item.id)}
            <div in:fade={{ duration: 300 }}>
                <NewsCard news={item} />
            </div>
        {/each}
    </div>
  {/each}
</div>
