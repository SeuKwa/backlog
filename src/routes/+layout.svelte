<script lang="ts">
  import { onMount } from 'svelte';
  import '../app.css';
  import { page } from '$app/stores';
  import { rehydrateCovers } from '$lib/storage/covers';

  $: path = $page.url.pathname;

  onMount(() => {
    void rehydrateCovers();
  });
</script>

<header class="topbar">
  <a class="brand" href="/">🎮 Backlog</a>
  <nav>
    <a href="/" class:active={path === '/'}>Bibliothèque</a>
    <a href="/picker" class:active={path === '/picker'}>🎲 Piocher</a>
    <a href="/io" class:active={path === '/io'}>Import / Export</a>
    <a href="/settings" class:active={path === '/settings'} aria-label="Paramètres">⚙️</a>
  </nav>
</header>

<main class="container">
  <slot />
</main>
