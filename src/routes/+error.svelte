<script lang="ts">
  import { page } from '$app/state';
</script>

<svelte:head>
  <title>Ошибка | Daily Dev News</title>
  <meta name="robots" content="noindex" />
</svelte:head>

<section class="min-h-screen bg-gray-50 dark:bg-gray-950 p-6 flex items-center justify-center">
  <div class="max-w-lg w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6 text-center">
    <h1 class="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-3">Не удалось загрузить страницу</h1>
    <p class="text-gray-600 dark:text-gray-400 mb-6">{page.error?.message ?? 'Произошла непредвиденная ошибка. Попробуйте обновить страницу.'}</p>
    <a href="/" class="inline-flex items-center rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-500 transition-colors">
      Вернуться на главную
    </a>
  </div>
</section>
