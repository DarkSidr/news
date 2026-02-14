
<script lang="ts">
  import type { PageData } from './$types';
  import { formatDistanceToNow } from 'date-fns';
  import { ru } from 'date-fns/locale';
  import { ExternalLink, ArrowLeft, Calendar, Clock } from 'lucide-svelte';
  import ThemeToggle from '$lib/components/ThemeToggle.svelte';

  let { data } = $props<{ data: PageData }>();
  
  let item = $derived(data.newsItem);
  let pageUrl = $derived(data.pageUrl);
  let safeContent = $derived(item.content ?? '');
  let safeDescription = $derived(item.contentSnippet || 'Подробности новости на TechNews.');
  let publishedIso = $derived(new Date(item.pubDate).toISOString());
  let timeAgo = $derived(
    formatDistanceToNow(new Date(item.pubDate), { addSuffix: true, locale: ru })
  );
  let newsArticleSchema = $derived({
    '@context': 'https://schema.org',
    '@type': 'NewsArticle',
    headline: item.title,
    description: safeDescription,
    datePublished: publishedIso,
    dateModified: publishedIso,
    mainEntityOfPage: pageUrl,
    author: {
      '@type': 'Organization',
      name: item.source
    },
    publisher: {
      '@type': 'Organization',
      name: 'TechNews'
    },
    image: item.imageUrl ? [item.imageUrl] : undefined
  });
</script>

<svelte:head>
  <title>{item.title} | TechNews</title>
  <meta name="description" content={safeDescription} />
  <meta name="robots" content="index,follow,max-image-preview:large" />
  <link rel="canonical" href={pageUrl} />
  <meta property="og:title" content={item.title} />
  <meta property="og:description" content={safeDescription} />
  <meta property="og:type" content="article" />
  <meta property="og:url" content={pageUrl} />
  {#if item.imageUrl}
    <meta property="og:image" content={item.imageUrl} />
  {/if}
  <meta property="article:published_time" content={publishedIso} />
  <script type="application/ld+json">
    {JSON.stringify(newsArticleSchema)}
  </script>
</svelte:head>

<div class="min-h-screen bg-white dark:bg-gray-950 transition-colors duration-300 pb-20">
  <!-- Navigation Bar -->
  <nav class="sticky top-0 z-50 w-full bg-white/80 dark:bg-gray-950/80 backdrop-blur-md border-b border-gray-100 dark:border-gray-800">
    <div class="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
      <a href="/" class="group inline-flex items-center text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
        <ArrowLeft size={18} class="mr-2 transition-transform group-hover:-translate-x-1" />
        К ленте новостей
      </a>
      <div class="flex items-center gap-4">
        <ThemeToggle />
      </div>
    </div>
  </nav>

  <article>
    <!-- Hero Section -->
    <header class="w-full pt-8 pb-4 md:pt-12 md:pb-8 border-b border-gray-100 dark:border-gray-800">
      <div class="px-4">
        <div class="max-w-4xl mx-auto">
             <div class="mb-4 md:mb-6">
                <span class="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-blue-600 text-white shadow-lg shadow-blue-900/20 tracking-wide uppercase">
                    {item.source}
                </span>
             </div>
             <h1 class="text-3xl md:text-5xl lg:text-6xl font-extrabold text-gray-900 dark:text-white leading-tight tracking-tight mb-6 max-w-5xl">
                {item.title}
             </h1>
             
             <div class="flex flex-wrap items-center gap-6 text-sm md:text-base text-gray-500 dark:text-gray-400 font-medium">
                <div class="flex items-center gap-2">
                    <Calendar size={18} class="text-blue-600 dark:text-blue-400" />
                    <span>{new Date(item.pubDate).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                </div>
                <div class="flex items-center gap-2">
                    <Clock size={18} class="text-blue-600 dark:text-blue-400" />
                    <span>{timeAgo}</span>
                </div>
             </div>
        </div>
      </div>
    </header>

    <!-- Content Section -->
    <div class="px-4 mt-8 md:mt-12">
        <div class="max-w-3xl mx-auto">
            <!-- Lead / Snippet -->
            <p class="text-xl md:text-2xl leading-relaxed text-gray-600 dark:text-gray-300 font-serif mb-10 border-l-4 border-blue-500 pl-6 italic">
                {item.contentSnippet}
            </p>

            {#if item.imageUrl}
               <figure class="my-8 md:my-10">
                  <img 
                    src={item.imageUrl} 
                    alt={item.title} 
                    class="w-full h-auto rounded-xl shadow-lg border border-gray-100 dark:border-gray-800"
                  />
               </figure>
            {/if}

            <div class="prose prose-lg md:prose-xl dark:prose-invert max-w-none 
                prose-headings:font-bold prose-headings:tracking-tight prose-headings:text-gray-900 dark:prose-headings:text-gray-100
                prose-p:text-gray-700 dark:prose-p:text-gray-300 prose-p:leading-8
                prose-a:text-blue-600 dark:prose-a:text-blue-400 prose-a:font-medium prose-a:no-underline hover:prose-a:underline
                prose-img:rounded-xl prose-img:shadow-xl prose-img:my-8
                prose-blockquote:border-l-blue-500 prose-blockquote:bg-gray-50 dark:prose-blockquote:bg-gray-900/50 prose-blockquote:py-2 prose-blockquote:px-6 prose-blockquote:rounded-r-lg
                ">
                {@html safeContent}
            </div>

            <!-- Footer Action -->
            <div class="mt-16 pt-8 border-t border-gray-100 dark:border-gray-800 flex flex-col items-center">
                <a 
                    href={item.link} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    class="group relative inline-flex items-center justify-center px-8 py-4 text-lg font-bold text-white transition-all duration-200 bg-blue-600 font-pj rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-600 hover:bg-blue-700 hover:shadow-lg hover:-translate-y-1"
                >
                    Читать оригинал на {item.source}
                    <ExternalLink size={20} class="ml-2" />
                </a>
            </div>
        </div>
    </div>
  </article>
</div>
