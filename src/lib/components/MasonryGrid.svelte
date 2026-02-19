<script lang="ts">
import type { NewsItem } from '$lib/types';
import NewsCard from '$lib/components/NewsCard.svelte';
import { fade } from 'svelte/transition';

  let { items } = $props<{ items: NewsItem[] }>();

  let innerWidth = $state(0);
  let numCols = $state(1);

  $effect(() => {
    if (innerWidth >= 1024) numCols = 3;
    else if (innerWidth >= 768) numCols = 2;
    else numCols = 1;
  });

  // Distribute items to the shortest column to balance height
  const columns = $derived.by(() => {
    const cols: NewsItem[][] = Array.from({ length: numCols }, () => []);
    const heights = new Array(numCols).fill(0);

    for (const item of items) {
      // Find the column with the minimum estimated height
      let minColIndex = 0;
      let minHeight = heights[0];

      for (let i = 1; i < numCols; i++) {
        if (heights[i] < minHeight) {
          minHeight = heights[i];
          minColIndex = i;
        }
      }

      cols[minColIndex].push(item);
      
      // Estimate height: title (approx 2 lines) + snippet (approx 3-4 lines)
      // We can use character count as a proxy for height
      const contentLen = (item.title.length * 1.5) + (item.contentSnippet?.length ?? 0);
      heights[minColIndex] += contentLen + 100; // +100 for padding/metadata
    }

    return cols;
  });
</script>

<svelte:window bind:innerWidth />

<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-start">
  {#each columns as column, i (i)}
    <div class="flex flex-col gap-6">
        {#each column as item (item.id)}
            <div in:fade={{ duration: 300 }}>
                <NewsCard news={item} />
            </div>
        {/each}
    </div>
  {/each}
</div>
