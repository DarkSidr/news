<script lang="ts">
import { onMount } from 'svelte';
import { dev } from '$app/environment';
import "../app.css";
import favicon from '$lib/assets/favicon.svg';

let { children } = $props();

const websiteSchema = {
	'@context': 'https://schema.org',
	'@type': 'WebSite',
	name: 'Daily Dev News',
	inLanguage: 'ru-RU',
	description: 'Интеллектуальный агрегатор технологических новостей'
};

onMount(() => {
	if ('serviceWorker' in navigator) {
		void navigator.serviceWorker.register('/service-worker.js', {
			type: dev ? 'module' : 'classic'
		});
	}
});
</script>

<svelte:head>
	<link rel="icon" href="{favicon}" />
	<meta name="application-name" content="Daily Dev News" />
	<meta name="theme-color" content="#020617" />
	<meta name="apple-mobile-web-app-capable" content="yes" />
	<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
	<meta name="apple-mobile-web-app-title" content="Daily Dev News" />
	<link rel="manifest" href="/manifest.webmanifest" />
	<script type="application/ld+json">
		{JSON.stringify(websiteSchema)}
	</script>
</svelte:head>

<a
	href="#main-content"
	class="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:rounded-md focus:bg-white focus:px-3 focus:py-2 focus:text-gray-900"
>
	Перейти к основному контенту
</a>

{@render children()}
