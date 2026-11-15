<script lang="ts">
  import type { Game } from '$lib/domain/types';
  import { EFFORT_LABELS, STATUS_LABELS } from '$lib/domain/game';
  import { formatMinutes } from '$lib/domain/export/markdown';

  export let game: Game;
</script>

<a class="card game-card" href="/game/{game.id}">
  {#if game.coverUrl}
    <img class="cover cover-img" src={game.coverUrl} alt="Jaquette de {game.title}" />
  {:else}
    <div class="cover" aria-hidden="true">{game.title.charAt(0).toUpperCase()}</div>
  {/if}
  <div class="card-body">
    <div class="card-title">{game.title}</div>
    <div class="card-meta">
      <span class="badge status-{game.status}">{STATUS_LABELS[game.status]}</span>
      <span class="badge">{EFFORT_LABELS[game.effort]}</span>
      <span class="muted">{formatMinutes(game.playtimeMinutes)}</span>
    </div>
    {#if game.bookmark}
      <div class="bookmark">📌 {game.bookmark}</div>
    {/if}
  </div>
</a>
