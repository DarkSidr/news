<script lang="ts">
  import { Sun, Moon } from 'lucide-svelte';
  import { onMount } from 'svelte';

  let isDark = $state(false);

  onMount(() => {
    isDark = document.documentElement.classList.contains('dark');
    
    // Listen for system preference changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => {
      if (!('theme' in localStorage)) {
        isDark = e.matches;
        if (e.matches) document.documentElement.classList.add('dark');
        else document.documentElement.classList.remove('dark');
      }
    };
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  });

  function toggleTheme(event: MouseEvent) {
    const isDarkNow = document.documentElement.classList.contains('dark');
    const nextDark = !isDarkNow;

    // Fallback for browsers without View Transitions
    if (!document.startViewTransition) {
      updateTheme(nextDark);
      return;
    }

    const x = event.clientX;
    const y = event.clientY;
    const endRadius = Math.hypot(
      Math.max(x, innerWidth - x),
      Math.max(y, innerHeight - y)
    );

    document.documentElement.classList.add('theme-transition');

    const transition = document.startViewTransition(() => {
      updateTheme(nextDark);
    });

    transition.finished.finally(() => {
      document.documentElement.classList.remove('theme-transition');
    });

    transition.ready.then(() => {
      const clipPath = [
        `circle(0px at ${x}px ${y}px)`,
        `circle(${endRadius}px at ${x}px ${y}px)`
      ];
      
      document.documentElement.animate(
        {
          clipPath: clipPath
        },
        {
          duration: 500,
          easing: 'ease-in-out',
          pseudoElement: '::view-transition-new(root)',
        }
      );
    });
  }

  function updateTheme(dark: boolean) {
    if (dark) {
      document.documentElement.classList.add('dark');
      localStorage.theme = 'dark';
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.theme = 'light';
    }
    isDark = dark;
  }
</script>

<button
  onclick={toggleTheme}
  class="relative p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 overflow-hidden group"
  aria-label={isDark ? "Переключить на светлую тему" : "Переключить на тёмную тему"}
>
  {#if isDark}
    <Moon size={20} class="text-blue-400" />
  {:else}
    <Sun size={20} class="text-yellow-500" />
  {/if}
</button>

<style>
  :global(::view-transition-group(root)),
  :global(::view-transition-image-pair(root)),
  :global(::view-transition-old(root)),
  :global(::view-transition-new(root)) {
    animation: none;
    mix-blend-mode: normal;
    pointer-events: none !important;
  }
  
  :global(::view-transition-old(root)) {
    z-index: 1;
  }
  :global(::view-transition-new(root)) {
    z-index: 9999;
  }
  
  :global(html.theme-transition) {
    cursor: pointer !important;
  }
  
  :global(html.theme-transition) *,
  :global(html.theme-transition)::view-transition-group(root),
  :global(html.theme-transition)::view-transition-image-pair(root),
  :global(html.theme-transition)::view-transition-old(root),
  :global(html.theme-transition)::view-transition-new(root) {
      cursor: pointer !important;
  }
</style>
