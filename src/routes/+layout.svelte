<script lang="ts">
  import { onMount } from 'svelte';
  import '../app.css';
  import { page } from '$app/stores';
  import { base } from '$app/paths';
  import { rehydrateCovers } from '$lib/storage/covers';

  $: path = $page.url.pathname.slice(base.length) || '/';

  onMount(() => {
    void rehydrateCovers();
  });
</script>

<header class="topbar">
  <a class="brand" href="{base}/">🎮 Backlog</a>
  <nav>
    <a href="{base}/" class:active={path === '/'}>Bibliothèque</a>
    <a href="{base}/picker" class:active={path === '/picker'}>🎲 Piocher</a>
    <a href="{base}/stats" class:active={path === '/stats'}>📊 Stats</a>
    <a href="{base}/io" class:active={path === '/io'}>Import / Export</a>
    <a href="{base}/settings" class:active={path === '/settings'} aria-label="Paramètres">⚙️</a>
  </nav>
</header>

<main class="container">
  <slot />
</main>
